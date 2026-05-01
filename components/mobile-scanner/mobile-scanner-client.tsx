"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rtcConfig, waitForIceGatheringComplete, type MobileScannerMessage } from "@/lib/webrtc";
import { cn } from "@/lib/utils";
import { RiCameraLine, RiLoader4Line, RiQrScan2Line, RiSendPlaneLine, RiStopLine } from "@remixicon/react";

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

function getStatusVariant(state: PhoneScannerState) {
  if (state === "connected") return "default";
  if (state === "failed" || state === "disconnected") return "destructive";
  return "secondary";
}

export function MobileScannerClient({ code }: MobileScannerClientProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [connectionState, setConnectionState] = useState<PhoneScannerState>("idle");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);

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
      if (!value) return;

      const now = Date.now();
      const lastScan = lastScanRef.current;

      if (lastScan?.value === value && now - lastScan.at < DUPLICATE_SCAN_WINDOW_MS) {
        return;
      }

      if (sendMessage({ type: "scan", value, format, at: now })) {
        lastScanRef.current = { value, at: now };
        setLastScanned(value);
        setManualValue("");

        if ("vibrate" in navigator) {
          navigator.vibrate(80);
        }
      }
    },
    [sendMessage]
  );

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraState((current) => (current === "active" || current === "starting" ? "stopped" : current));
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || cameraState === "starting" || cameraState === "active") return;

    setCameraState("starting");
    setError(null);

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (result) => {
          if (!result) return;
          sendScan(result.getText(), String(result.getBarcodeFormat()));
        }
      );

      controlsRef.current = controls;
      setCameraState("active");
    } catch (err) {
      setCameraState("failed");
      const message = err instanceof Error ? err.message : "Kamera tidak dapat dibuka";
      setError(message);
      sendMessage({ type: "error", message, at: Date.now() });
    }
  }, [cameraState, sendMessage, sendScan]);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (!token) {
        setConnectionState("failed");
        setError("Link scanner tidak valid: token hilang.");
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
      }
    }

    void connect();

    return () => {
      cancelled = true;
      stopCamera();
      channelRef.current?.close();
      channelRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [code, sendMessage, stopCamera, token]);

  const handleManualSubmit = () => {
    sendScan(manualValue, "manual");
  };

  return (
    <main className="min-h-dvh bg-background p-4 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RiQrScan2Line data-icon="inline-start" />
                  Phone Scanner
                </CardTitle>
                <CardDescription>Kirim barcode sparepart ke dialog restock di desktop.</CardDescription>
              </div>
              <Badge variant={getStatusVariant(connectionState)}>{connectionState}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <div className="overflow-hidden rounded-lg bg-muted">
              <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={startCamera} disabled={cameraState === "starting" || cameraState === "active"}>
                {cameraState === "starting" ? (
                  <RiLoader4Line data-icon="inline-start" className="animate-spin" />
                ) : (
                  <RiCameraLine data-icon="inline-start" />
                )}
                Start Camera
              </Button>
              <Button type="button" variant="outline" onClick={stopCamera} disabled={cameraState !== "active"}>
                <RiStopLine data-icon="inline-start" />
                Stop
              </Button>
              <Badge variant="outline" className="self-center">
                Camera: {cameraState}
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manual-barcode">Manual fallback</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-barcode"
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleManualSubmit();
                    }
                  }}
                  placeholder="Masukkan barcode atau ID"
                />
                <Button type="button" variant="outline" onClick={handleManualSubmit} disabled={!manualValue.trim()}>
                  <RiSendPlaneLine data-icon="inline-start" />
                  Send
                </Button>
              </div>
            </div>

            <div className={cn("rounded-md border p-3 text-sm", lastScanned ? "text-foreground" : "text-muted-foreground")}>
              Last scanned: {lastScanned ?? "Belum ada"}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
