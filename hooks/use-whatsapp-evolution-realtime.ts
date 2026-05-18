"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { getWhatsappRealtimeConfig, type WhatsappLiveState } from "@/actions/whatsapp";

type WhatsappRealtimeStatus = "disabled" | "connecting" | "connected" | "disconnected" | "error";

export interface EvolutionRealtimePayload {
  event?: string;
  instance?: string;
  data?: unknown;
  date_time?: string;
  sender?: string;
}

interface WhatsappRealtimeEventLog {
  event: string;
  sentAt: number;
  sender?: string;
  payload?: EvolutionRealtimePayload;
}

interface UseWhatsappEvolutionRealtimeOptions {
  tokoId: string;
  enabled?: boolean;
  onConnectionUpdate?: (state: WhatsappLiveState) => void;
}

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function getConnectionState(payload: EvolutionRealtimePayload): WhatsappLiveState | null {
  const data = getObject(payload.data);
  const instance = getObject(data?.instance);
  const state = typeof data?.state === "string"
    ? data.state
    : typeof data?.connection === "string"
      ? data.connection
      : typeof instance?.state === "string"
        ? instance.state
        : null;

  if (!state) return null;

  const connectedNumber = typeof data?.number === "string"
    ? data.number
    : typeof instance?.owner === "string"
      ? instance.owner
      : null;
  const connectedProfileName = typeof data?.profileName === "string"
    ? data.profileName
    : typeof instance?.profileName === "string"
      ? instance.profileName
      : null;

  return { state, connectedNumber, connectedProfileName };
}

export function useWhatsappEvolutionRealtime({ tokoId, enabled = true, onConnectionUpdate }: UseWhatsappEvolutionRealtimeOptions) {
  const socketRef = React.useRef<Socket | null>(null);
  const onConnectionUpdateRef = React.useRef(onConnectionUpdate);
  const [status, setStatus] = React.useState<WhatsappRealtimeStatus>(enabled ? "connecting" : "disabled");
  const [eventHistory, setEventHistory] = React.useState<WhatsappRealtimeEventLog[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    onConnectionUpdateRef.current = onConnectionUpdate;
  }, [onConnectionUpdate]);

  React.useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => setStatus("disabled"));
      return;
    }

    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      setStatus("connecting");
      setError(null);
    });

    getWhatsappRealtimeConfig(tokoId).then((result) => {
      if (!active) return;

      if (!result.success) {
        setStatus("error");
        setError(result.error || "Realtime WhatsApp tidak tersedia");
        return;
      }

      if (!result.data) {
        setStatus("disabled");
        return;
      }

      const { evolutionUrl, instanceName, instanceToken } = result.data;
      const socket = io(`${evolutionUrl}/${instanceName}`, {
        query: { apikey: instanceToken },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      socketRef.current = socket;

      const recordEvent = (eventName: string, payload: EvolutionRealtimePayload) => {
        if (payload.instance && payload.instance !== instanceName) return;

        setEventHistory((current) => [
          { event: eventName, sentAt: Date.now(), sender: payload.sender, payload },
          ...current,
        ].slice(0, 5));
      };

      socket.on("connect", () => {
        setStatus("connected");
        setError(null);
      });
      socket.on("disconnect", () => setStatus("disconnected"));
      socket.on("connect_error", (eventError) => {
        setStatus("error");
        setError(eventError.message || "Gagal terhubung ke realtime WhatsApp");
      });

      socket.on("connection.update", (payload: EvolutionRealtimePayload) => {
        recordEvent("connection.update", payload);
        const state = getConnectionState(payload);
        if (state) onConnectionUpdateRef.current?.(state);
      });

      for (const eventName of ["messages.upsert", "messages.update", "send.message", "qrcode.updated"] as const) {
        socket.on(eventName, (payload: EvolutionRealtimePayload) => recordEvent(eventName, payload));
      }
    }).catch((eventError) => {
      if (!active) return;
      setStatus("error");
      setError(eventError instanceof Error ? eventError.message : "Gagal menyiapkan realtime WhatsApp");
    });

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [enabled, tokoId]);

  return { status, eventHistory, error };
}
