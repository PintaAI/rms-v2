"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PartySocket from "partysocket";
import { BarcodeFormat, BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { RiCameraLine, RiLoader4Line, RiQrScan2Line } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseScannerRealtimeServerMessage } from "@/lib/realtime/scanner-realtime-types";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
const DUPLICATE_SCAN_WINDOW_MS = 1_500;
const DECODE_FEEDBACK_THROTTLE_MS = 1_000;
const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  audio: false,
};
const SAVED_DEVICE_STORAGE_KEY = "rms.mobileScannerDevice";

interface MobileScannerClientProps {
  code?: string;
}

type PhoneScannerState = "idle" | "connecting" | "connected" | "disconnected" | "failed";
type CameraState = "idle" | "starting" | "active" | "stopped" | "failed";

interface SavedDeviceCredentials {
  deviceId: string;
  token: string;
}

interface SavedSessionResponse {
  session: {
    code: string;
    token: string;
    room: string;
    expiresAt: number;
  } | null;
}

function readSavedDeviceCredentials(): SavedDeviceCredentials | null {
  try {
    const raw = window.localStorage.getItem(SAVED_DEVICE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedDeviceCredentials>;
    if (typeof parsed.deviceId !== "string" || typeof parsed.token !== "string") return null;

    return { deviceId: parsed.deviceId, token: parsed.token };
  } catch {
    return null;
  }
}

function writeSavedDeviceCredentials(credentials: SavedDeviceCredentials) {
  window.localStorage.setItem(SAVED_DEVICE_STORAGE_KEY, JSON.stringify(credentials));
}

function clearSavedDeviceCredentials() {
  window.localStorage.removeItem(SAVED_DEVICE_STORAGE_KEY);
}

export function MobileScannerClient({ code }: MobileScannerClientProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const hasPairingToken = Boolean(code && token);
  const [connectionState, setConnectionState] = useState<PhoneScannerState>("idle");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodeFeedback, setDecodeFeedback] = useState<string>("Tahan tombol untuk mulai.");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [savedDevice, setSavedDevice] = useState<SavedDeviceCredentials | null>(null);
  const activePairingRef = useRef<{ code: string; token: string } | null>(null);
  const registeringDeviceRef = useRef(false);
  const socketRef = useRef<PartySocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const lastDecodeFeedbackRef = useRef(0);
  const holdScanningRef = useRef(false);
  const sentInCurrentHoldRef = useRef<Set<string>>(new Set());
  const pairingRedirectingRef = useRef(false);

  const playDetectedBeep = useCallback(() => {
    try {
      const AudioContext =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.05, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.12);
      oscillator.addEventListener("ended", () => void audioContext.close());
    } catch {
      // Beep feedback is optional; some browsers block Web Audio until user interaction.
    }
  }, []);

  const rememberCurrentDevice = useCallback(async () => {
    const saved = readSavedDeviceCredentials();
    if (saved) {
      setSavedDevice(saved);
      return;
    }

    const activePairing = activePairingRef.current;
    if (!activePairing || registeringDeviceRef.current) return;

    registeringDeviceRef.current = true;

    try {
      const response = await fetch("/api/mobile-scanner/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "register-device", code: activePairing.code, token: activePairing.token }),
      });

      if (!response.ok) {
        registeringDeviceRef.current = false;
        return;
      }

      const data = (await response.json()) as SavedDeviceCredentials;
      writeSavedDeviceCredentials(data);
      setSavedDevice(data);
    } catch {
      registeringDeviceRef.current = false;
      // Remembering the phone is optional; the active scanner session still works.
    }
  }, []);

  const sendScan = useCallback((rawValue: string, format?: string) => {
    const value = rawValue.trim();
    if (!value) return false;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Scanner belum terhubung ke desktop");
      return false;
    }

    const now = Date.now();
    const lastScan = lastScanRef.current;

    if (lastScan?.value === value && now - lastScan.at < DUPLICATE_SCAN_WINDOW_MS) {
      return false;
    }

    socket.send(JSON.stringify({ type: "scan", value, format, at: now }));
    lastScanRef.current = { value, at: now };
    setLastScanned(value);

    if ("vibrate" in navigator) {
      navigator.vibrate(80);
    }

    return true;
  }, []);

  const handlePairingQr = useCallback(
    (rawValue: string) => {
      if (pairingRedirectingRef.current) return;

      try {
        const url = new URL(rawValue, window.location.origin);
        const hasScannerToken = url.pathname.startsWith("/scanner/") && url.searchParams.has("token");

        if (!hasScannerToken) {
          setDecodeFeedback("QR bukan pairing scanner. Scan QR dari dialog desktop.");
          return;
        }

        pairingRedirectingRef.current = true;
        playDetectedBeep();
        toast.success("Pairing QR terdeteksi", { description: "Menghubungkan ke desktop..." });
        window.location.assign(url.toString());
      } catch {
        setDecodeFeedback("QR pairing tidak valid. Scan QR dari dialog desktop.");
      }
    },
    [playDetectedBeep]
  );

  const stopScanLoop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    holdScanningRef.current = false;
    sentInCurrentHoldRef.current.clear();
    setIsScanning(false);
  }, []);

  const closeCamera = useCallback(() => {
    stopScanLoop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    setDecodeFeedback("Camera berhenti.");
    setCameraState((current) => (current === "active" || current === "starting" ? "stopped" : current));
  }, [stopScanLoop]);

  const openViewfinder = useCallback(async () => {
    if (!videoRef.current || cameraState === "starting" || cameraState === "active") return;

    setCameraState("starting");
    setError(null);
    setDecodeFeedback("Membuka camera belakang...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      streamRef.current = stream;
      BrowserCodeReader.addVideoSource(videoRef.current, stream);
      await BrowserCodeReader.tryPlayVideo(videoRef.current);

      setCameraState("active");
      setDecodeFeedback(
        connectionState === "connected"
          ? "Tahan tombol untuk scan label sparepart."
          : "Tahan tombol untuk scan QR pairing."
      );
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraState("failed");
      const message = err instanceof Error ? err.message : "Kamera tidak dapat dibuka";
      setError(message);
      setDecodeFeedback(`Camera gagal: ${message}`);
    }
  }, [cameraState, connectionState]);

  const startScanLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current || controlsRef.current) return;

    holdScanningRef.current = true;
    sentInCurrentHoldRef.current.clear();
    setIsScanning(true);
    setError(null);

    try {
      const hints = new Map<DecodeHintType, unknown>();
      hints.set(
        DecodeHintType.POSSIBLE_FORMATS,
        connectionState === "connected" ? [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128] : [BarcodeFormat.QR_CODE]
      );
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 150,
        delayBetweenScanSuccess: 800,
      });
      controlsRef.current = reader.scan(
        video,
        (result, scanError) => {
          if (!holdScanningRef.current) return;

          if (result) {
            const format = String(result.getBarcodeFormat());
            const value = result.getText().trim();

            if (connectionState !== "connected") {
              handlePairingQr(value);
              return;
            }

            if (!sentInCurrentHoldRef.current.has(value)) {
              sentInCurrentHoldRef.current.add(value);
              const sent = sendScan(value, format);

              if (!sent) return;

              playDetectedBeep();
              toast.success("Barcode dikirim", { description: value });
              setDecodeFeedback(`Terkirim ${format}: ${value}. Lepas tombol untuk jeda scan.`);
            } else {
              setDecodeFeedback(`Sudah terkirim ${format}: ${value}. Geser ke label lain atau lepas tombol.`);
            }

            return;
          }

          if (!scanError) return;

          const now = Date.now();
          if (now - lastDecodeFeedbackRef.current < DECODE_FEEDBACK_THROTTLE_MS) return;

          lastDecodeFeedbackRef.current = now;
          setDecodeFeedback(
            scanError.name === "NotFoundException"
              ? "Camera aktif, belum menemukan QR/Code128. Dekatkan, sejajarkan, dan pastikan label terang."
              : `Decode error: ${scanError.name || scanError.message}`
          );
        }
      );
      setDecodeFeedback(
        connectionState === "connected"
          ? "Arahkan ke label sparepart."
          : "Scan QR pairing dari desktop."
      );
    } catch (err) {
      stopScanLoop();
      const message = err instanceof Error ? err.message : "Scanner tidak dapat dimulai";
      setError(message);
      setDecodeFeedback(`Scanner gagal: ${message}`);
    }
  }, [connectionState, handlePairingQr, playDetectedBeep, sendScan, stopScanLoop]);

  const connectToRoom = useCallback(
    (room: string, token: string) => {
      if (!PARTYKIT_HOST) {
        setConnectionState("failed");
        setError("Realtime scanner belum dikonfigurasi");
        setDecodeFeedback("Realtime scanner belum dikonfigurasi.");
        return;
      }

      socketRef.current?.close();
      setConnectionState("connecting");
      setError(null);

      const socket = new PartySocket({ host: PARTYKIT_HOST, room });
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "scanner.guest-init", token }));
      });

      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;

        const message = parseScannerRealtimeServerMessage(event.data);
        if (!message) return;

        if (message.type === "scanner.peer-ready" && message.role === "guest") {
          setConnectionState("connected");
          setDecodeFeedback("Terhubung. Tahan tombol untuk scan label sparepart.");
          void rememberCurrentDevice();
          return;
        }

        if (message.type === "scanner.auth-error") {
          if (readSavedDeviceCredentials()) {
            window.location.replace("/scanner");
            return;
          }

          setConnectionState("failed");
          setError(message.message);
          setDecodeFeedback("Sesi lama tidak aktif. Buka Scan via HP di desktop, lalu hubungkan lagi.");
          return;
        }

        if (message.type === "scanner.peer-left") {
          if (readSavedDeviceCredentials()) {
            window.location.replace("/scanner");
            return;
          }

          setConnectionState("disconnected");
          setError("Koneksi ke desktop terputus");
          setDecodeFeedback("Buka Scan via HP di desktop, lalu hubungkan lagi.");
          toast.error("Koneksi terputus", { description: "Buka Scan via HP di desktop, lalu hubungkan lagi." });
        }
      });

      socket.addEventListener("close", () => {
        setConnectionState((current) => (current === "connected" || current === "connecting" ? "disconnected" : current));
      });

      socket.addEventListener("error", () => {
        setConnectionState("failed");
        setError("Koneksi realtime scanner bermasalah");
      });
    },
    [rememberCurrentDevice]
  );

  useEffect(() => {
    if (!hasPairingToken || !code || !token) {
      const storedDevice = readSavedDeviceCredentials();
      setSavedDevice(storedDevice);
      setConnectionState("idle");
      setError(null);
      setDecodeFeedback(storedDevice ? "Buka Scan via HP di desktop, lalu hubungkan." : "Scan QR pairing dari desktop.");
      return;
    }

    activePairingRef.current = { code, token };
    setDecodeFeedback("Menghubungkan ke desktop...");
    connectToRoom(`scanner-${code}`, token);

    return () => {
      closeCamera();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [closeCamera, code, connectToRoom, hasPairingToken, token]);

  const connectSavedDevice = useCallback(async () => {
    if (!savedDevice) return;

    setConnectionState("connecting");
    setError(null);
    setDecodeFeedback("Mencari desktop aktif...");

    try {
      const response = await fetch(
        `/api/mobile-scanner/signal?deviceId=${encodeURIComponent(savedDevice.deviceId)}&deviceToken=${encodeURIComponent(savedDevice.token)}`,
        { cache: "no-store" }
      );

      if (response.status === 404) {
        clearSavedDeviceCredentials();
        setSavedDevice(null);
        setConnectionState("failed");
        setDecodeFeedback("Pairing tersimpan tidak valid. Scan QR baru dari desktop.");
        return;
      }

      if (!response.ok) throw new Error("Gagal mencari desktop aktif");

      const data = (await response.json()) as SavedSessionResponse;
      if (!data.session) {
        setConnectionState("idle");
        setDecodeFeedback("Desktop belum membuka Scan via HP.");
        return;
      }

      activePairingRef.current = null;
      setDecodeFeedback("Desktop ditemukan. Menghubungkan...");
      connectToRoom(data.session.room, data.session.token);
    } catch (err) {
      setConnectionState("failed");
      setError(err instanceof Error ? err.message : "Reconnect gagal");
      setDecodeFeedback("Gagal reconnect. Pastikan desktop sudah membuka Scan via HP.");
    }
  }, [connectToRoom, savedDevice]);

  const handleHoldScanStart = async () => {
    holdScanningRef.current = true;

    if (cameraState !== "active") {
      await openViewfinder();
    }

    if (holdScanningRef.current) {
      startScanLoop();
    }
  };

  const handleHoldScanEnd = () => {
    stopScanLoop();
    setDecodeFeedback(
      cameraState === "active"
        ? connectionState === "connected"
          ? "Tahan tombol untuk scan label sparepart."
          : "Tahan tombol untuk scan QR pairing."
        : "Tahan tombol untuk mulai."
    );
  };

  const isCameraOpening = cameraState === "starting";
  const isCameraActive = cameraState === "active";
  const isConnected = connectionState === "connected";
  const statusLabel = isConnected ? "Terhubung" : connectionState === "connecting" ? "Menghubungkan" : "Belum terhubung";
  const statusClassName = isConnected
    ? "bg-emerald-500"
    : connectionState === "connecting"
      ? "bg-amber-500"
      : "bg-red-500";
  const title = isConnected ? "Scan Sparepart" : "Pair Scanner";
  const instruction = isConnected
    ? "Kamera tetap aktif sebagai viewfinder. Tahan tombol hanya saat ingin scan."
    : hasPairingToken
      ? "Kamera tetap aktif sebagai viewfinder. Tahan tombol untuk pairing."
      : savedDevice
        ? "Buka Scan via HP di desktop, lalu hubungkan HP ini."
        : "Scan QR pairing dari desktop untuk menghubungkan HP ini.";

  return (
    <main className="flex h-dvh overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-5 py-6">
        <header className="flex shrink-0 flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <RiQrScan2Line className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <span className={`size-2 rounded-full ${statusClassName}`} />
              {statusLabel}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{instruction}</p>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col justify-center gap-5 py-5">
          <div className="relative overflow-hidden rounded-3xl border bg-black shadow-2xl shadow-black/20">
            <video ref={videoRef} className="aspect-[16/9] w-full object-cover" muted playsInline />

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.45)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.95)]" />
            <div className="pointer-events-none absolute inset-6 rounded-2xl border border-white/40" />

            {!isCameraActive && !isCameraOpening && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white/75">
                {isConnected ? "Kamera siap" : "Scan QR desktop"}
              </div>
            )}
          </div>

          {(error || lastScanned || decodeFeedback) && (
            <div className={cn("min-h-6 text-center text-xs", error ? "text-destructive font-medium" : "text-muted-foreground")}>
              {error ? <span>{error}</span> : <span>{lastScanned ? `Terakhir: ${lastScanned}` : decodeFeedback}</span>}
            </div>
          )}
        </section>

        <footer className="flex shrink-0 flex-col items-center gap-3 pb-2">
          <Button
            type="button"
            size="icon"
            aria-label="Tahan untuk scan"
            className="size-24 touch-none select-none rounded-full border-4 border-primary/20 shadow-xl shadow-primary/25 active:scale-95"
            onPointerDown={handleHoldScanStart}
            onPointerUp={handleHoldScanEnd}
            onPointerCancel={handleHoldScanEnd}
            onPointerLeave={handleHoldScanEnd}
            onKeyDown={(event) => {
              if (event.repeat || (event.key !== " " && event.key !== "Enter")) return;
              event.preventDefault();
              handleHoldScanStart();
            }}
            onKeyUp={(event) => {
              if (event.key !== " " && event.key !== "Enter") return;
              event.preventDefault();
              handleHoldScanEnd();
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            {isCameraOpening ? <RiLoader4Line className="size-8 animate-spin" /> : <RiCameraLine className="size-8" />}
          </Button>
          <div className="text-center text-xs font-medium text-muted-foreground">
            {isScanning ? "Lepas untuk jeda scan" : isConnected ? "Tahan untuk scan" : savedDevice && !hasPairingToken ? "Hubungkan saat desktop siap" : "Tahan untuk pairing"}
          </div>
          {savedDevice && !hasPairingToken && !isConnected && (
            <Button type="button" variant="secondary" size="sm" onClick={() => void connectSavedDevice()} disabled={connectionState === "connecting"}>
              {connectionState === "connecting" ? <RiLoader4Line className="size-3.5 animate-spin" /> : null}
              Hubungkan ke Desktop
            </Button>
          )}
          {(connectionState === "failed" || connectionState === "disconnected") && hasPairingToken && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RiLoader4Line className="size-3.5" />
              Hubungkan Ulang
            </Button>
          )}
        </footer>
      </div>
    </main>
  );
}
