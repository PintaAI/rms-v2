"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import PartySocket from "partysocket";
import {
  RiAddCircleLine,
  RiBroadcastLine,
  RiCheckboxCircleLine,
  RiDeleteBin6Line,
  RiEdit2Line,
  RiHistoryLine,
  RiLoader4Line,
  RiMoneyDollarCircleLine,
  RiSignalWifiErrorLine,
  RiToolsLine,
  RiTruckLine,
  RiUser3Line,
  RiUserShared2Line,
} from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getBrandIcon } from "@/lib/brand-icons";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import { isServiceRealtimeEvent, type PublishServiceRealtimeEvent, type ServiceRealtimeEvent } from "@/lib/realtime/service-realtime-types";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST;

type RealtimeConnectionStatus = "disabled" | "connecting" | "connected" | "disconnected" | "error";

interface DashboardRealtimeContextValue {
  status: RealtimeConnectionStatus;
  isRefreshing: boolean;
  lastEvent: ServiceRealtimeEvent | null;
  eventHistory: ServiceRealtimeEvent[];
  publish: (event: PublishServiceRealtimeEvent) => void;
}

const DashboardRealtimeContext = createContext<DashboardRealtimeContextValue | null>(null);

export function useDashboardRealtime() {
  const context = useContext(DashboardRealtimeContext);
  if (!context) {
    throw new Error("useDashboardRealtime must be used within a DashboardRealtimeProvider");
  }
  return context;
}

export function DashboardRealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { tokoId, user } = useDashboardScope();
  const socketRef = useRef<PartySocket | null>(null);
  const [status, setStatus] = useState<RealtimeConnectionStatus>(PARTYKIT_HOST ? "connecting" : "disabled");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastEvent, setLastEvent] = useState<ServiceRealtimeEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<ServiceRealtimeEvent[]>([]);

  const recordEvent = useCallback((event: ServiceRealtimeEvent) => {
    setLastEvent(event);
    setEventHistory((current) => [event, ...current.filter((item) => item.sentAt !== event.sentAt)].slice(0, 5));
  }, []);

  const refreshFromServer = useCallback(() => {
    setIsRefreshing(true);
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (!isRefreshing) return;

    const timeout = window.setTimeout(() => setIsRefreshing(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [isRefreshing, lastEvent]);

  useEffect(() => {
    if (!PARTYKIT_HOST || !tokoId) {
      return;
    }

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: `toko-${tokoId}`,
    });
    socketRef.current = socket;

    const handleOpen = () => setStatus("connected");
    const handleClose = () => setStatus("disconnected");
    const handleError = () => setStatus("error");
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (!isServiceRealtimeEvent(data) || data.tokoId !== tokoId) return;

        recordEvent(data);
        refreshFromServer();
      } catch {
        // Ignore malformed realtime payloads from external clients.
      }
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", handleError);
    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("message", handleMessage);
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [recordEvent, refreshFromServer, tokoId]);

  const publish = useCallback((event: PublishServiceRealtimeEvent) => {
    const payload: ServiceRealtimeEvent = {
      type: "service.changed",
      tokoId,
      ...event,
      actor: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      sentAt: Date.now(),
    };

    recordEvent(payload);

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  }, [recordEvent, tokoId, user.id, user.name, user.role]);

  const value = useMemo<DashboardRealtimeContextValue>(() => ({
    status,
    isRefreshing,
    lastEvent,
    eventHistory,
    publish,
  }), [eventHistory, isRefreshing, lastEvent, publish, status]);

  return (
    <DashboardRealtimeContext.Provider value={value}>
      {children}
    </DashboardRealtimeContext.Provider>
  );
}

const actionLabels: Record<ServiceRealtimeEvent["action"], string> = {
  created: "membuat",
  updated: "mengubah",
  deleted: "menghapus",
  status_changed: "mengubah status",
  assigned: "assign teknisi",
  taken: "mengambil task",
  picked_up: "pickup",
  payment_updated: "update pembayaran",
  item_updated: "update item",
};

const actionIcons: Record<ServiceRealtimeEvent["action"], ComponentType<{ className?: string }>> = {
  created: RiAddCircleLine,
  updated: RiEdit2Line,
  deleted: RiDeleteBin6Line,
  status_changed: RiCheckboxCircleLine,
  assigned: RiUserShared2Line,
  taken: RiUserShared2Line,
  picked_up: RiTruckLine,
  payment_updated: RiMoneyDollarCircleLine,
  item_updated: RiToolsLine,
};

const statusLabels: Record<RealtimeConnectionStatus, string> = {
  disabled: "Realtime off",
  connecting: "Menghubungkan",
  connected: "Live Update",
  disconnected: "Terputus",
  error: "Realtime error",
};

export function DashboardRealtimeIndicator() {
  const { status, isRefreshing, lastEvent, eventHistory } = useDashboardRealtime();
  const [historyOpen, setHistoryOpen] = useState(false);
  const closeHistoryTimerRef = useRef<number | null>(null);
  const connected = status === "connected";
  const isWorking = status === "connecting" || isRefreshing;
  const hasHistory = eventHistory.length > 0;

  const openHistory = useCallback(() => {
    if (closeHistoryTimerRef.current) {
      window.clearTimeout(closeHistoryTimerRef.current);
      closeHistoryTimerRef.current = null;
    }
    setHistoryOpen(true);
  }, []);

  const closeHistory = useCallback(() => {
    closeHistoryTimerRef.current = window.setTimeout(() => {
      setHistoryOpen(false);
      closeHistoryTimerRef.current = null;
    }, 120);
  }, []);

  useEffect(() => () => {
    if (closeHistoryTimerRef.current) window.clearTimeout(closeHistoryTimerRef.current);
  }, []);

  return (
    <Popover open={historyOpen && hasHistory}>
      <PopoverTrigger asChild>
        <div
          className="hidden min-w-0 w-full items-center gap-2 rounded-full border border-border/60 bg-muted/35 px-2.5 py-1.5 text-xs text-muted-foreground lg:flex"
          onBlur={closeHistory}
          onFocus={openHistory}
          onMouseEnter={openHistory}
          onMouseLeave={closeHistory}
          tabIndex={hasHistory ? 0 : -1}
        >
          {isWorking ? (
            <RiLoader4Line className="size-3.5 shrink-0 animate-spin text-primary" />
          ) : connected ? (
            <RiBroadcastLine className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <RiSignalWifiErrorLine className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <Badge
            variant={connected ? "success" : status === "disabled" ? "outline" : "warning"}
            className={cn("h-5 px-1.5", isRefreshing && "bg-primary/10 text-primary")}
          >
            {isRefreshing ? "Syncing" : statusLabels[status]}
          </Badge>
          {lastEvent ? <RealtimeEventMessage event={lastEvent} /> : null}
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[28rem] max-w-[calc(100vw-2rem)] gap-2 p-3"
        onMouseEnter={openHistory}
        onMouseLeave={closeHistory}
      >
        <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-xs font-medium text-foreground">
          <RiHistoryLine className="size-4 text-muted-foreground" />
          Riwayat realtime terakhir
        </div>
        <div className="space-y-2">
          {eventHistory.map((event) => (
            <div key={`${event.sentAt}-${event.serviceId}-${event.action}`} className="flex min-w-0 items-start gap-2 rounded-md px-1.5 py-1">
              <span className="mt-0.5 shrink-0 text-[10px] text-muted-foreground">
                {formatEventTime(event.sentAt)}
              </span>
              <RealtimeEventMessage event={event} className="text-[11px]" />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RealtimeEventMessage({ event, className }: { event: ServiceRealtimeEvent; className?: string }) {
  const serviceIcon = event.serviceBrand ? getBrandIcon(event.serviceBrand) : null;
  const ActionIcon = actionIcons[event.action];

  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 truncate text-muted-foreground/90", className)}>
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <RiUser3Line className="size-3.5 shrink-0 text-muted-foreground" />
        {event.actor?.name ?? "User"}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
        <ActionIcon className="size-3.5 shrink-0" />
        {actionLabels[event.action]}
      </span>
      {event.reason ? <span className="shrink-0">{event.reason} di</span> : null}
      <span className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground/90">
        {serviceIcon ? <span className="shrink-0 text-foreground/70 [&>svg]:size-3.5">{serviceIcon}</span> : null}
        <span className="truncate">{event.serviceLabel ?? event.serviceId}</span>
      </span>
    </span>
  );
}

function formatEventTime(sentAt: number) {
  return new Date(sentAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
