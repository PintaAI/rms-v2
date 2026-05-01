"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarcodeFormat, BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { rtcConfig, waitForIceGatheringComplete, type MobileScannerMessage } from "@/lib/webrtc";
import { RiCameraLine, RiLoader4Line, RiQrScan2Line } from "@remixicon/react";
import { toast } from "sonner";

interface MobileScannerClientProps {
  code: string;
}

interface OfferResponse {
  offer: string;
  tokoId: string;
}

type PhoneScannerState = "idle" | "connecting" | "connected" | "disconnected" | "failed";
type CameraState = "idle" | "starting" | "active" | "stopped" | "failed";

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

export function MobileScannerClient({ code }: MobileScannerClientProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [connectionState, setConnectionState] = useState<PhoneScannerState>("idle");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodeFeedback, setDecodeFeedback] = useState<string>("Tahan tombol untuk mulai.");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
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

  const sendMessage = useCallback((message: MobileScannerMessage) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") {
      setError("Scanner belum terhubung ke desktop");
      return false;
    }

    channel.send(JSON.stringify(message));
    return true;
  }, []);

  const sendScan = useCallback(
    (rawValue: string, format?: string) => {
      const value = rawValue.trim();
      if (!value) return false;

      const now = Date.now();
      const lastScan = lastScanRef.current;

      if (lastScan?.value === value && now - lastScan.at < DUPLICATE_SCAN_WINDOW_MS) {
        return false;
      }

      if (sendMessage({ type: "scan", value, format, at: now })) {
        lastScanRef.current = { value, at: now };
        setLastScanned(value);

        if ("vibrate" in navigator) {
          navigator.vibrate(80);
        }

        return true;
      }

      return false;
    },
    [sendMessage]
  );

  const handlePairingQr = useCallback(
    (rawValue: string) => {
      if (pairingRedirectingRef.current) return;

      try {
        const url = new URL(rawValue, window.location.origin);
        const hasPairingToken = url.pathname.startsWith("/scanner/") && url.searchParams.has("token");

        if (!hasPairingToken) {
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
          ? "Viewfinder aktif. Tahan tombol untuk scan label sparepart."
          : "Viewfinder aktif. Tahan tombol untuk scan QR pairing."
      );
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraState("failed");
      const message = err instanceof Error ? err.message : "Kamera tidak dapat dibuka";
      setError(message);
      setDecodeFeedback(`Camera gagal: ${message}`);
      sendMessage({ type: "error", message, at: Date.now() });
    }
  }, [cameraState, connectionState, sendMessage]);

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
      readerRef.current = reader;
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
      sendMessage({ type: "error", message, at: Date.now() });
    }
  }, [connectionState, handlePairingQr, playDetectedBeep, sendMessage, sendScan, stopScanLoop]);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (!token) {
        setConnectionState("failed");
        setError(null);
        setDecodeFeedback("Belum terhubung. Scan QR pairing dari desktop.");
        return;
      }

      setConnectionState("connecting");

      try {
        const offerResponse = await fetch(
          `/api/mobile-scanner/signal?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );

        if (!offerResponse.ok) {
          throw new Error("QR scanner sudah kedaluwarsa atau tidak valid");
        }

        const offerData = (await offerResponse.json()) as OfferResponse;
        if (cancelled) return;

        const pc = new RTCPeerConnection(rtcConfig);
        pcRef.current = pc;

        pc.ondatachannel = (event) => {
          const channel = event.channel;
          channelRef.current = channel;
          channel.onopen = () => {
            setConnectionState("connected");
            sendMessage({ type: "ready", at: Date.now() });
          };
          channel.onclose = () => setConnectionState("disconnected");
          channel.onerror = () => {
            setConnectionState("failed");
            setError("Koneksi ke desktop bermasalah");
          };
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setConnectionState("connected");
          } else if (pc.connectionState === "disconnected") {
            setConnectionState("disconnected");
          } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
            setConnectionState(pc.connectionState === "failed" ? "failed" : "disconnected");
          }
        };

        await pc.setRemoteDescription(JSON.parse(offerData.offer) as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGatheringComplete(pc);

        if (!pc.localDescription) {
          throw new Error("Gagal membuat jawaban WebRTC");
        }

        const answerResponse = await fetch("/api/mobile-scanner/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "answer",
            code,
            token,
            sdp: JSON.stringify(pc.localDescription),
          }),
        });

        if (!answerResponse.ok) {
          throw new Error("Gagal mengirim jawaban pairing");
        }
      } catch (err) {
        if (cancelled) return;
        setConnectionState("failed");
        setError(err instanceof Error ? err.message : "Pairing gagal");
        setDecodeFeedback("Gagal terhubung. Scan QR pairing baru dari desktop.");
      }
    }

    void connect();

    return () => {
      cancelled = true;
      closeCamera();
      channelRef.current?.close();
      channelRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [closeCamera, code, sendMessage, token]);

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
          ? "Viewfinder aktif. Tahan tombol untuk scan label sparepart."
          : "Viewfinder aktif. Tahan tombol untuk scan QR pairing."
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
    : "Kamera tetap aktif sebagai viewfinder. Tahan tombol untuk pairing.";

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

            {isCameraActive && !isScanning && (
              <div className="absolute inset-x-4 bottom-4 rounded-full bg-black/65 px-4 py-2 text-center text-xs font-medium text-white/85">
                Viewfinder aktif, tahan tombol untuk scan
              </div>
            )}
          </div>

          {(error || lastScanned || decodeFeedback) && (
            <div className="min-h-6 text-center text-xs text-muted-foreground">
              {error ? <span className="text-destructive">{error}</span> : <span>{lastScanned ? `Terakhir: ${lastScanned}` : decodeFeedback}</span>}
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
            {isScanning ? "Lepas untuk jeda scan" : isConnected ? "Tahan untuk scan" : "Tahan untuk pairing"}
          </div>
        </footer>
      </div>
    </main>
  );
}
