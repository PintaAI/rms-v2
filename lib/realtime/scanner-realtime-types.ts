export type MobileScannerMessage = { type: "scan"; value: string; format?: string; at: number };

export type MobileScannerConnectionState =
  | "idle"
  | "pairing"
  | "connected"
  | "disconnected"
  | "failed";

export type ScannerRealtimeClientMessage =
  | { type: "scanner.host-init"; token: string; expiresAt: number }
  | { type: "scanner.guest-init"; token: string }
  | MobileScannerMessage;

export type ScannerRealtimeServerMessage =
  | { type: "scanner.peer-ready"; role: "guest"; at: number }
  | { type: "scanner.auth-error"; message: string; at: number }
  | { type: "scanner.peer-left"; role: "host" | "guest"; at: number }
  | MobileScannerMessage;

export function parseMobileScannerMessage(data: string): MobileScannerMessage | null {
  try {
    const parsed = JSON.parse(data) as Partial<MobileScannerMessage>;

    if (parsed.type === "scan" && typeof parsed.value === "string" && typeof parsed.at === "number") {
      return {
        type: "scan",
        value: parsed.value,
        format: typeof parsed.format === "string" ? parsed.format : undefined,
        at: parsed.at,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function parseScannerRealtimeServerMessage(data: string): ScannerRealtimeServerMessage | null {
  const scannerMessage = parseMobileScannerMessage(data);
  if (scannerMessage) return scannerMessage;

  try {
    const parsed = JSON.parse(data) as Partial<ScannerRealtimeServerMessage>;

    if (
      parsed.type === "scanner.peer-ready"
      && parsed.role === "guest"
      && typeof parsed.at === "number"
    ) {
      return { type: "scanner.peer-ready", role: parsed.role, at: parsed.at };
    }

    if (parsed.type === "scanner.auth-error" && typeof parsed.message === "string" && typeof parsed.at === "number") {
      return { type: "scanner.auth-error", message: parsed.message, at: parsed.at };
    }

    if (
      parsed.type === "scanner.peer-left"
      && (parsed.role === "host" || parsed.role === "guest")
      && typeof parsed.at === "number"
    ) {
      return { type: "scanner.peer-left", role: parsed.role, at: parsed.at };
    }

    return null;
  } catch {
    return null;
  }
}
