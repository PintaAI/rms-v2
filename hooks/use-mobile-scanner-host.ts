"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import {
  parseScannerRealtimeServerMessage,
  type MobileScannerConnectionState,
} from "@/lib/realtime/scanner-realtime-types";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
const PAIRING_TIMEOUT_MS = 90_000;
const PAIRING_TIMEOUT_MESSAGE = "Waktu pairing habis. Buat QR baru untuk mencoba lagi.";

interface UseMobileScannerHostOptions {
  tokoId: string;
  onScan: (value: string) => void | Promise<void>;
}

interface CreateSessionResponse {
  code: string;
  token: string;
  room: string;
  expiresAt: number;
  expiresIn: number;
}

export interface RememberedScannerDevice {
  id: string;
  tokoId: string;
  ownerUserId: string;
  name: string;
  createdAt: number;
  lastSeenAt: number | null;
}

interface ListDevicesResponse {
  devices: RememberedScannerDevice[];
}

export interface UseMobileScannerHostReturn {
  state: MobileScannerConnectionState;
  code: string | null;
  inviteUrl: string | null;
  devices: RememberedScannerDevice[];
  secondsRemaining: number | null;
  error: string | null;
  startPairing: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

export function useMobileScannerHost({ tokoId, onScan }: UseMobileScannerHostOptions): UseMobileScannerHostReturn {
  const [state, setState] = useState<MobileScannerConnectionState>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [devices, setDevices] = useState<RememberedScannerDevice[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRef = useRef<string | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const refreshDevices = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/mobile-scanner/signal?role=devices&tokoId=${encodeURIComponent(tokoId)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Gagal mengambil daftar HP tersimpan");
      }

      const data = (await response.json()) as ListDevicesResponse;
      setDevices(data.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil daftar HP tersimpan");
    }
  }, [tokoId]);

  const revokeDevice = useCallback(async (deviceId: string) => {
    const response = await fetch(`/api/mobile-scanner/signal?deviceId=${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Gagal melupakan HP scanner");
      return;
    }

    setDevices((current) => current.filter((device) => device.id !== deviceId));
  }, []);

  const clearTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimers = useCallback(() => {
    setSecondsRemaining(Math.ceil(PAIRING_TIMEOUT_MS / 1000));
    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((current) => (current === null ? null : Math.max(0, current - 1)));
    }, 1_000);

    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setSecondsRemaining(0);
      setState("failed");
      setError(PAIRING_TIMEOUT_MESSAGE);
      socketRef.current?.close();
      socketRef.current = null;
    }, PAIRING_TIMEOUT_MS);
  }, [clearTimers]);

  const disconnect = useCallback(() => {
    clearTimers();
    socketRef.current?.close();
    socketRef.current = null;

    const activeCode = codeRef.current;
    if (activeCode) {
      fetch(`/api/mobile-scanner/signal?code=${encodeURIComponent(activeCode)}`, { method: "DELETE" }).catch(() => {});
    }

    codeRef.current = null;
    setCode(null);
    setInviteUrl(null);
    setSecondsRemaining(null);
    setState("idle");
  }, [clearTimers]);

  const startPairing = useCallback(async () => {
    disconnect();
    setError(null);
    setState("pairing");
    void refreshDevices();

    if (!PARTYKIT_HOST) {
      setState("failed");
      setError("Realtime scanner belum dikonfigurasi");
      return;
    }

    try {
      const response = await fetch("/api/mobile-scanner/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "offer", tokoId }),
      });

      if (!response.ok) {
        throw new Error("Gagal membuat sesi scanner");
      }

      const data = (await response.json()) as CreateSessionResponse;
      const url = new URL(`/scanner/${data.code}`, window.location.origin);
      url.searchParams.set("token", data.token);

      const socket = new PartySocket({ host: PARTYKIT_HOST, room: data.room });
      socketRef.current = socket;
      codeRef.current = data.code;

      socket.addEventListener("open", () => {
        setState("pairing");
        socket.send(JSON.stringify({ type: "scanner.host-init", token: data.token, expiresAt: data.expiresAt }));
      });

      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;

        const message = parseScannerRealtimeServerMessage(event.data);
        if (!message) return;

        if (message.type === "scanner.peer-ready" && message.role === "guest") {
          clearTimers();
          setSecondsRemaining(null);
          setState("connected");
          return;
        }

        if (message.type === "scanner.auth-error") {
          clearTimers();
          setState("failed");
          setError(message.message);
          return;
        }

        if (message.type === "scanner.peer-left") {
          setState("disconnected");
          setError("Koneksi scanner terputus");
          return;
        }

        if (message.type === "scan") {
          void onScanRef.current(message.value);
        } else if (message.type === "error") {
          setError(message.message);
        }
      });

      socket.addEventListener("close", () => {
        setState((current) => (current === "idle" || current === "failed" ? current : "disconnected"));
      });

      socket.addEventListener("error", () => {
        clearTimers();
        setState("failed");
        setError("Koneksi realtime scanner bermasalah");
      });

      setCode(data.code);
      setInviteUrl(url.toString());
      startTimers();
    } catch (err) {
      clearTimers();
      socketRef.current?.close();
      socketRef.current = null;
      codeRef.current = null;
      setCode(null);
      setInviteUrl(null);
      setSecondsRemaining(null);
      setState("failed");
      setError(err instanceof Error ? err.message : "Scanner gagal dimulai");
    }
  }, [clearTimers, disconnect, refreshDevices, startTimers, tokoId]);

  useEffect(() => disconnect, [disconnect]);

  return {
    state,
    code,
    inviteUrl,
    devices,
    secondsRemaining,
    error,
    startPairing,
    refreshDevices,
    revokeDevice,
    disconnect,
    clearError: () => setError(null),
  };
}
