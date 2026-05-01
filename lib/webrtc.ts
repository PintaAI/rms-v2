export type MobileScannerMessage =
  | { type: "ready"; at: number }
  | { type: "scan"; value: string; format?: string; at: number }
  | { type: "error"; message: string; at: number };

export type MobileScannerConnectionState =
  | "idle"
  | "pairing"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

export const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

export function waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const handleStateChange = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", handleStateChange);
        resolve();
      }
    };

    pc.addEventListener("icegatheringstatechange", handleStateChange);
  });
}

export function parseMobileScannerMessage(data: string): MobileScannerMessage | null {
  try {
    const parsed = JSON.parse(data) as Partial<MobileScannerMessage>;

    if (parsed.type === "ready" && typeof parsed.at === "number") {
      return { type: "ready", at: parsed.at };
    }

    if (parsed.type === "scan" && typeof parsed.value === "string" && typeof parsed.at === "number") {
      return {
        type: "scan",
        value: parsed.value,
        format: typeof parsed.format === "string" ? parsed.format : undefined,
        at: parsed.at,
      };
    }

    if (parsed.type === "error" && typeof parsed.message === "string" && typeof parsed.at === "number") {
      return { type: "error", message: parsed.message, at: parsed.at };
    }

    return null;
  } catch {
    return null;
  }
}
