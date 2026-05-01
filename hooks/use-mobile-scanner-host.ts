"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseMobileScannerMessage,
  rtcConfig,
  waitForIceGatheringComplete,
  type MobileScannerConnectionState,
} from "@/lib/webrtc";

interface UseMobileScannerHostOptions {
  tokoId: string;
  onScan: (value: string) => void | Promise<void>;
}

interface CreateOfferResponse {
  code: string;
  token: string;
  expiresIn: number;
}

interface PollAnswerResponse {
  answer: string | null;
}

export interface UseMobileScannerHostReturn {
  state: MobileScannerConnectionState;
  code: string | null;
  inviteUrl: string | null;
  secondsRemaining: number | null;
  error: string | null;
  startPairing: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

const PAIRING_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;
const PAIRING_TIMEOUT_MESSAGE = "Waktu pairing habis. Buat QR baru untuk mencoba lagi.";

export function useMobileScannerHost({ tokoId, onScan }: UseMobileScannerHostOptions): UseMobileScannerHostReturn {
  const [state, setState] = useState<MobileScannerConnectionState>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRef = useRef<string | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const clearTimers = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimers();

    channelRef.current?.close();
    channelRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

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

  const pollForAnswer = useCallback(
    (pc: RTCPeerConnection, sessionCode: string) => {
      setSecondsRemaining(Math.ceil(PAIRING_TIMEOUT_MS / 1000));
      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining((current) => (current === null ? null : Math.max(0, current - 1)));
      }, 1_000);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/mobile-scanner/signal?code=${encodeURIComponent(sessionCode)}&role=host`,
            { cache: "no-store" }
          );

          if (!response.ok) {
            throw new Error("Gagal mengambil jawaban pairing");
          }

          const data = (await response.json()) as PollAnswerResponse;
          if (!data.answer) return;

          clearTimers();
          setSecondsRemaining(null);
          setState("connecting");
          await pc.setRemoteDescription(JSON.parse(data.answer) as RTCSessionDescriptionInit);
        } catch (err) {
          clearTimers();
          setSecondsRemaining(null);
          setState("failed");
          setError(err instanceof Error ? err.message : "Pairing gagal");
        }
      }, POLL_INTERVAL_MS);

      timeoutRef.current = setTimeout(() => {
        clearTimers();
        setSecondsRemaining(0);
        setState("failed");
        setError(PAIRING_TIMEOUT_MESSAGE);
      }, PAIRING_TIMEOUT_MS);
    },
    [clearTimers]
  );

  const startPairing = useCallback(async () => {
    disconnect();
    setError(null);
    setState("pairing");

    try {
      const pc = new RTCPeerConnection(rtcConfig);
      const channel = pc.createDataChannel("mobile-scanner");

      pcRef.current = pc;
      channelRef.current = channel;

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          clearTimers();
          setSecondsRemaining(null);
          setState("connected");
        } else if (pc.connectionState === "disconnected") {
          setState("disconnected");
        } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          clearTimers();
          setSecondsRemaining(null);
          setState(pc.connectionState === "failed" ? "failed" : "disconnected");
        }
      };

      channel.onopen = () => {
        clearTimers();
        setSecondsRemaining(null);
        setState("connected");
      };
      channel.onclose = () => setState("disconnected");
      channel.onerror = () => {
        setState("failed");
        setError("Koneksi scanner bermasalah");
      };
      channel.onmessage = (event) => {
        if (typeof event.data !== "string") return;

        const message = parseMobileScannerMessage(event.data);
        if (!message) return;

        if (message.type === "scan") {
          void onScanRef.current(message.value);
        } else if (message.type === "error") {
          setError(message.message);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc);

      if (!pc.localDescription) {
        throw new Error("Gagal membuat offer WebRTC");
      }

      const response = await fetch("/api/mobile-scanner/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "offer",
          tokoId,
          sdp: JSON.stringify(pc.localDescription),
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal membuat sesi scanner");
      }

      const data = (await response.json()) as CreateOfferResponse;
      const url = new URL(`/scanner/${data.code}`, window.location.origin);
      url.searchParams.set("token", data.token);

      codeRef.current = data.code;
      setCode(data.code);
      setInviteUrl(url.toString());
      pollForAnswer(pc, data.code);
    } catch (err) {
      clearTimers();
      setSecondsRemaining(null);
      pcRef.current?.close();
      pcRef.current = null;
      channelRef.current = null;
      codeRef.current = null;
      setCode(null);
      setInviteUrl(null);
      setState("failed");
      setError(err instanceof Error ? err.message : "Scanner gagal dimulai");
    }
  }, [clearTimers, disconnect, pollForAnswer, tokoId]);

  useEffect(() => disconnect, [disconnect]);

  return {
    state,
    code,
    inviteUrl,
    secondsRemaining,
    error,
    startPairing,
    disconnect,
    clearError: () => setError(null),
  };
}
