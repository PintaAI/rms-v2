"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMobileScannerHost, type UseMobileScannerHostReturn } from "@/hooks/use-mobile-scanner-host";
import type { MobileScannerConnectionState } from "@/lib/webrtc";
import { RiLoader4Line, RiRefreshLine, RiStopLine } from "@remixicon/react";
import { RiQrScan2Line } from "@remixicon/react";
import { cn } from "@/lib/utils";

export function getScannerStatusVariant(state: MobileScannerConnectionState) {
  if (state === "connected") return "default";
  if (state === "failed" || state === "disconnected") return "destructive";
  return "secondary";
}

export function useScannerPairing({ tokoId, onScan }: { tokoId: string; onScan: (value: string) => void | Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const host = useMobileScannerHost({ tokoId, onScan });

  useEffect(() => {
    if (isOpen && host.state === "idle") {
      void host.startPairing();
    }
  }, [isOpen, host.state, host.startPairing]);

  return { ...host, isOpen, setIsOpen };
}

interface ScannerPairingPanelProps {
  host: UseMobileScannerHostReturn;
  onClose?: () => void;
  className?: string;
}

export function ScannerPairingPanel({ host, onClose, className }: ScannerPairingPanelProps) {
  const { state, code, inviteUrl, secondsRemaining, error, startPairing, disconnect, clearError } = host;

  if (state === "connected") return null;

  const isTimedOut = state === "failed" && secondsRemaining === 0;

  return (
    <div className={cn("flex flex-col gap-3 rounded-md border bg-muted/20 p-3", className)}>
      <div>
        <div className="text-sm font-medium">Phone Scanner</div>
        <div className="text-xs text-muted-foreground">
          Scan QR ini dari HP untuk mengirim barcode.
        </div>
      </div>

      {error && !isTimedOut && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <div>{error}</div>
          <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={clearError}>
            Tutup pesan
          </Button>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {inviteUrl ? (
          <div className="relative rounded-md bg-white p-2">
            <QRCodeSVG value={inviteUrl} size={112} marginSize={1} title="Mobile scanner pairing QR" />
            {isTimedOut && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-background/90 p-3 text-center">
                <div className="text-xs font-medium text-foreground">Waktu pairing habis</div>
                <div className="text-[0.625rem] leading-tight text-muted-foreground">Buat QR baru untuk mencoba lagi.</div>
                <Button type="button" size="sm" onClick={() => void startPairing()}>
                  <RiRefreshLine className="mr-1.5 size-4" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex size-28 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <RiLoader4Line className="animate-spin" />
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Kode: {code ?? "membuat..."}</span>
          <span>Timeout: {secondsRemaining !== null ? `${secondsRemaining}s` : "-"}</span>
        </div>
      </div>

      {!isTimedOut && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              disconnect();
              onClose?.();
            }}
            disabled={state === "idle"}
          >
            <RiStopLine className="mr-1.5 size-4" />
            Stop
          </Button>
        </div>
      )}
    </div>
  );
}

interface ScannerToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  state: MobileScannerConnectionState;
  disabled?: boolean;
}

export function ScannerToggleButton({ isOpen, onToggle, state, disabled }: ScannerToggleButtonProps) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={onToggle} disabled={disabled}>
        <RiQrScan2Line className="mr-1.5 size-4" />
        {isOpen ? "Sembunyikan" : "Scan via HP"}
      </Button>
      {(isOpen || state !== "idle") && (
        <Badge variant={getScannerStatusVariant(state)}>{state}</Badge>
      )}
    </>
  );
}
