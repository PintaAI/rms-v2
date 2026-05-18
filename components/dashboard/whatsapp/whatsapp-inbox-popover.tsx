"use client";

import * as React from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { RiCheckDoubleLine, RiCheckLine, RiErrorWarningLine, RiLoader4Line, RiQrCodeLine, RiSendPlane2Line, RiUserLine, RiWhatsappLine } from "@remixicon/react";
import {
  getWhatsappInboxChats,
  getWhatsappInboxMessages,
  getWhatsappState,
  sendWhatsappInboxMessage,
  type WhatsappInboxChat,
  type WhatsappInboxLinkedService,
  type WhatsappInboxMessage,
  type WhatsappInboxMessageStatus,
  type WhatsappInboxMessagesResponse,
} from "@/actions/whatsapp";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDashboardWhatsappRealtime } from "@/components/dashboard/whatsapp/whatsapp-realtime-provider";
import type { EvolutionRealtimePayload } from "@/hooks/use-whatsapp-evolution-realtime";
import { getBrandIcon } from "@/lib/brand-icons";
import { cn } from "@/lib/utils";

const WHATSAPP_CLIENT_DEBUG = process.env.NEXT_PUBLIC_WHATSAPP_DEBUG === "true";
const WHATSAPP_CLIENT_STATUS_DEBUG = WHATSAPP_CLIENT_DEBUG || process.env.NODE_ENV !== "production";
const CHAT_PAGE_SIZE = 10;
const MESSAGE_PAGE_SIZE = 50;

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

interface InboxDebugEntry {
  label: string;
  at: number;
  text: string;
}

function formatChatTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function getChatIdentityKey(chat: WhatsappInboxChat) {
  return chat.number ?? chat.alternateJid ?? chat.remoteJid;
}

function getChatDisplayName(chat: WhatsappInboxChat) {
  return chat.linkedService?.customerName?.trim() || chat.name;
}

function getServiceBrandName(deviceName: string) {
  return deviceName.trim().split(/\s+/)[0] || deviceName;
}

function getServiceStatusBadgeVariant(status: string) {
  if (status === "done") return "success";
  if (status === "failed") return "destructive";
  if (status === "repairing") return "warning";
  if (status === "received") return "secondary";
  return "outline";
}

function getServiceStatusLabel(status: string) {
  if (status === "done") return "Done";
  if (status === "failed") return "Failed";
  if (status === "repairing") return "Repairing";
  if (status === "received") return "Received";
  return status;
}

function ServiceDeviceBadges({ service, className, showStatus = true }: { service: WhatsappInboxLinkedService; className?: string; showStatus?: boolean }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <Badge variant="outline" className="min-w-0 max-w-full shrink justify-start gap-1 px-1.5">
        {getBrandIcon(getServiceBrandName(service.deviceName))}
        <span className="truncate">{service.deviceName}</span>
      </Badge>
      {showStatus ? <Badge variant={getServiceStatusBadgeVariant(service.status)}>{getServiceStatusLabel(service.status)}</Badge> : null}
    </span>
  );
}

function MessageTimestamp({ message, className }: { message: WhatsappInboxMessage; className?: string }) {
  const status = message.status ?? (message.id.startsWith("optimistic-") ? "PENDING" : "SERVER_ACK");

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px]", message.fromMe ? "text-white/70" : "text-muted-foreground", className)}>
      {formatChatTime(message.timestamp)}
      {message.fromMe && (status === "PENDING" || status === "SERVER_ACK") ? <RiCheckLine className="size-3" /> : null}
      {message.fromMe && status === "DELIVERY_ACK" ? <RiCheckDoubleLine className="size-3" /> : null}
      {message.fromMe && (status === "READ" || status === "PLAYED") ? <RiCheckDoubleLine className="size-3 text-sky-300" /> : null}
      {message.fromMe && status === "ERROR" ? <RiErrorWarningLine className="size-3 text-amber-200" /> : null}
    </span>
  );
}

function getRealtimeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function getRealtimeString(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function normalizeRealtimeMessageStatus(value: unknown): WhatsappInboxMessageStatus | null {
  if (typeof value === "number") {
    if (value === 0) return "ERROR";
    if (value === 1) return "PENDING";
    if (value === 2) return "SERVER_ACK";
    if (value === 3) return "DELIVERY_ACK";
    if (value === 4) return "READ";
    if (value === 5) return "PLAYED";
    return null;
  }

  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (["ERROR", "PENDING", "SERVER_ACK", "DELIVERY_ACK", "READ", "PLAYED"].includes(normalized)) return normalized as WhatsappInboxMessageStatus;
  if (normalized === "SENT") return "SERVER_ACK";
  if (normalized === "DELIVERED") return "DELIVERY_ACK";
  return null;
}

function getBestRealtimeMessageStatus(statuses: Array<WhatsappInboxMessageStatus | null>) {
  const priority: WhatsappInboxMessageStatus[] = ["ERROR", "PENDING", "SERVER_ACK", "DELIVERY_ACK", "READ", "PLAYED"];
  return statuses.reduce<WhatsappInboxMessageStatus | null>((best, status) => {
    if (!status) return best;
    if (!best) return status;
    return priority.indexOf(status) > priority.indexOf(best) ? status : best;
  }, null);
}

function getRealtimeMessageUpdateStatus(value: unknown) {
  if (Array.isArray(value)) {
    return getBestRealtimeMessageStatus(value.map((item) => {
      const record = getRealtimeRecord(item);
      return normalizeRealtimeMessageStatus(record?.status ?? record?.messageStatus ?? record?.ack);
    }));
  }

  const record = getRealtimeRecord(value);
  return normalizeRealtimeMessageStatus(record?.status ?? record?.messageStatus ?? record?.ack);
}

function extractRealtimeMessageStatusUpdate(payload: EvolutionRealtimePayload | undefined) {
  const data = payload?.data;
  const records = Array.isArray(data) ? data : [data];

  for (const item of records) {
    const record = getRealtimeRecord(item);
    if (!record) continue;

    const key = getRealtimeRecord(record.key);
    const update = getRealtimeRecord(record.update);
    const status = normalizeRealtimeMessageStatus(record.status ?? record.messageStatus ?? record.ack ?? update?.status ?? update?.messageStatus ?? update?.ack)
      ?? getRealtimeMessageUpdateStatus(record.MessageUpdate);
    const id = getRealtimeString(record, ["id", "messageId"]) ?? getRealtimeString(key, ["id"]);

    if (id && status) return { id, status };
  }

  return null;
}

function getRealtimeMessageStatusDebug(payload: EvolutionRealtimePayload | undefined) {
  const data = payload?.data;
  const records = Array.isArray(data) ? data : [data];

  return records.map((item) => {
    const record = getRealtimeRecord(item);
    const key = getRealtimeRecord(record?.key);
    const update = getRealtimeRecord(record?.update);
    const messageUpdateStatus = getRealtimeMessageUpdateStatus(record?.MessageUpdate);

    return {
      id: getRealtimeString(record, ["id", "messageId"]) ?? getRealtimeString(key, ["id"]),
      remoteJid: getRealtimeString(record, ["remoteJid"]) ?? getRealtimeString(key, ["remoteJid"]),
      fromMe: key?.fromMe === true || record?.fromMe === true,
      parsedStatus: normalizeRealtimeMessageStatus(record?.status ?? record?.messageStatus ?? record?.ack ?? update?.status ?? update?.messageStatus ?? update?.ack) ?? messageUpdateStatus,
      direct: {
        status: record?.status ?? null,
        messageStatus: record?.messageStatus ?? null,
        ack: record?.ack ?? null,
      },
      update: {
        status: update?.status ?? null,
        messageStatus: update?.messageStatus ?? null,
        ack: update?.ack ?? null,
      },
      MessageUpdate: record?.MessageUpdate ?? null,
    };
  });
}

function redactDebugValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[Max depth]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactDebugValue(item, depth + 1));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("apikey") || lowerKey.includes("token") || lowerKey.includes("hash")) {
      return [key, "[REDACTED]"];
    }

    return [key, redactDebugValue(entry, depth + 1)];
  }));
}

function prettyDebug(value: unknown) {
  return JSON.stringify(redactDebugValue(value), null, 2);
}

export function WhatsappInboxPopover() {
  const { tokoId, permissionAccess, featureAccess } = useDashboardScope();
  const canView = Boolean(featureAccess["whatsapp.integration"] && permissionAccess["whatsapp.view"]);
  const canSend = Boolean(featureAccess["whatsapp.integration"] && permissionAccess["whatsapp.send"]);
  const canManageSettings = Boolean(featureAccess["whatsapp.integration"] && permissionAccess["whatsapp.manageSettings"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [selectedChat, setSelectedChat] = React.useState<WhatsappInboxChat | null>(null);
  const [draft, setDraft] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [debugEntries, setDebugEntries] = React.useState<InboxDebugEntry[]>([]);
  const messagesScrollAreaRef = React.useRef<HTMLDivElement | null>(null);
  const selectedChatRef = React.useRef<WhatsappInboxChat | null>(null);
  const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const preserveMessagesScrollRef = React.useRef<{ height: number; top: number } | null>(null);
  const shouldScrollMessagesToBottomRef = React.useRef(false);

  const chatsQueryKey = React.useMemo(() => ["whatsapp", "chats", tokoId] as const, [tokoId]);
  const messagesQueryKey = React.useMemo(
    () => ["whatsapp", "messages", tokoId, selectedChat?.remoteJid ?? null, selectedChat?.alternateJid ?? null] as const,
    [selectedChat?.alternateJid, selectedChat?.remoteJid, tokoId]
  );
  const whatsappStateQueryKey = React.useMemo(() => ["whatsapp", "state", tokoId] as const, [tokoId]);

  const { realtime: whatsappRealtime, openChatRequest, setInboxOpen } = useDashboardWhatsappRealtime();
  const latestRealtimeEvent = whatsappRealtime.eventHistory[0];

  React.useEffect(() => {
    setInboxOpen(open);
    return () => setInboxOpen(false);
  }, [open, setInboxOpen]);

  const whatsappStateQuery = useQuery({
    queryKey: whatsappStateQueryKey,
    enabled: canView && open,
    queryFn: async () => {
      const result = await getWhatsappState(tokoId);
      if (!result.success || !result.data) return { state: null, connectedNumber: null, connectedProfileName: null };
      return result.data;
    },
  });

  const isCheckingPairing = open && whatsappStateQuery.isLoading;
  const isWhatsappPaired = whatsappStateQuery.data?.state === "open";
  const isWhatsappNotPaired = open && whatsappStateQuery.isFetched && !isWhatsappPaired;

  React.useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const recordDebug = React.useCallback((label: string, data: unknown) => {
    if (!WHATSAPP_CLIENT_DEBUG) return;
    const redacted = redactDebugValue(data);
    console.groupCollapsed(`[WhatsApp Inbox] ${label}`);
    console.log(redacted);
    console.groupEnd();
    setDebugEntries((current) => [{ label, at: Date.now(), text: prettyDebug(redacted) }, ...current].slice(0, 4));
  }, []);

  const chatsQuery = useInfiniteQuery({
    queryKey: chatsQueryKey,
    enabled: canView && open && isWhatsappPaired,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const result = await getWhatsappInboxChats(tokoId, { cursor: Number(pageParam), limit: CHAT_PAGE_SIZE });
      if (!result.success || !result.data) {
        recordDebug("findChats error", result);
        throw new Error(result.error || "Gagal memuat chat WhatsApp");
      }

      recordDebug("findChats response", result.data.raw ?? null);
      return result.data;
    },
    getNextPageParam: () => null,
  });

  const messagesQuery = useInfiniteQuery({
    queryKey: messagesQueryKey,
    enabled: canView && open && Boolean(selectedChat),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!selectedChat) return { items: [], nextCursor: null, raw: null };

      const result = await getWhatsappInboxMessages(tokoId, selectedChat.remoteJid, selectedChat.alternateJid, { cursor: Number(pageParam), limit: MESSAGE_PAGE_SIZE });
      if (!result.success || !result.data) {
        recordDebug("findMessages error", result);
        throw new Error(result.error || "Gagal memuat pesan WhatsApp");
      }

      recordDebug(`findMessages response: ${selectedChat.remoteJid}`, result.data.raw ?? null);
      return result.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const chats = React.useMemo(() => uniqueBy(chatsQuery.data?.pages.flatMap((page) => page.items) ?? [], getChatIdentityKey), [chatsQuery.data]);
  const messages = React.useMemo(() => uniqueBy(messagesQuery.data?.pages.flatMap((page) => page.items) ?? [], (message) => message.id)
    .sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? "")), [messagesQuery.data]);
  const isLoadingChats = chatsQuery.isLoading || chatsQuery.isFetchingNextPage;
  const isLoadingMessages = messagesQuery.isLoading || messagesQuery.isFetchingNextPage;

  React.useEffect(() => {
    if (!canView || !openChatRequest) return;

    setOpen(true);

    const targetChat = chats.find((chat) => {
      const targetJids = [openChatRequest.remoteJid, openChatRequest.alternateJid].filter(Boolean);
      return targetJids.includes(chat.remoteJid) || Boolean(chat.alternateJid && targetJids.includes(chat.alternateJid));
    });

    if (targetChat) setSelectedChat(targetChat);
  }, [canView, chats, openChatRequest]);

  const scheduleRealtimeRefresh = React.useCallback((eventLabel: string, payload: unknown) => {
    recordDebug(eventLabel, payload);
    if (refreshTimerRef.current) return;

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void queryClient.invalidateQueries({ queryKey: whatsappStateQueryKey });
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
      const currentChat = selectedChatRef.current;
      if (currentChat) {
        void queryClient.invalidateQueries({ queryKey: ["whatsapp", "messages", tokoId, currentChat.remoteJid, currentChat.alternateJid] });
      }
    }, 750);
  }, [chatsQueryKey, queryClient, recordDebug, tokoId, whatsappStateQueryKey]);

  const applyRealtimeMessageStatus = React.useCallback((payload: EvolutionRealtimePayload | undefined) => {
    const update = extractRealtimeMessageStatusUpdate(payload);
    if (!update) return false;

    let changed = false;
    queryClient.setQueryData<InfiniteData<WhatsappInboxMessagesResponse>>(messagesQueryKey, (current) => {
      if (!current) return current;

      const pages = current.pages.map((page) => ({
        ...page,
        items: page.items.map((message) => {
          if (message.id !== update.id) return message;
          changed = true;
          return { ...message, status: update.status };
        }),
      }));

      return changed ? { ...current, pages } : current;
    });

    return changed;
  }, [messagesQueryKey, queryClient]);

  React.useEffect(() => {
    if (!open || !latestRealtimeEvent) return;
    if (!["messages.upsert", "messages.update", "send.message"].includes(latestRealtimeEvent.event)) return;

    if (WHATSAPP_CLIENT_STATUS_DEBUG) {
      // noop
    }

    if (latestRealtimeEvent.event === "messages.update") {
      const didUpdateStatus = applyRealtimeMessageStatus(latestRealtimeEvent.payload);
      if (didUpdateStatus) {
        recordDebug(`realtime ${latestRealtimeEvent.event}`, latestRealtimeEvent.payload ?? latestRealtimeEvent);
        void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
        return;
      }
    }

    queueMicrotask(() => {
      scheduleRealtimeRefresh(`realtime ${latestRealtimeEvent.event}`, latestRealtimeEvent.payload ?? latestRealtimeEvent);
    });
  }, [applyRealtimeMessageStatus, chatsQueryKey, latestRealtimeEvent, open, queryClient, recordDebug, scheduleRealtimeRefresh]);

  React.useEffect(() => () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  React.useEffect(() => {
    if (chatsQuery.error) toast.error(chatsQuery.error.message || "Gagal memuat chat WhatsApp");
  }, [chatsQuery.error]);

  React.useEffect(() => {
    if (messagesQuery.error) toast.error(messagesQuery.error.message || "Gagal memuat pesan WhatsApp");
  }, [messagesQuery.error]);

  React.useEffect(() => {
    shouldScrollMessagesToBottomRef.current = Boolean(selectedChat);
    preserveMessagesScrollRef.current = null;
  }, [selectedChat?.alternateJid, selectedChat?.remoteJid]);

  React.useEffect(() => {
    const viewport = messagesScrollAreaRef.current?.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']");
    if (!viewport || messages.length === 0 || isLoadingMessages) return;

    requestAnimationFrame(() => {
      const preserveScroll = preserveMessagesScrollRef.current;
      if (preserveScroll) {
        viewport.scrollTop = viewport.scrollHeight - preserveScroll.height + preserveScroll.top;
        preserveMessagesScrollRef.current = null;
        return;
      }

      if (shouldScrollMessagesToBottomRef.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
  }, [isLoadingMessages, messages.length]);

  React.useEffect(() => {
    const viewport = messagesScrollAreaRef.current?.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']");
    if (!viewport) return;

    const handleScroll = () => {
      shouldScrollMessagesToBottomRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
      if (viewport.scrollTop > 24 || !messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;
      preserveMessagesScrollRef.current = { height: viewport.scrollHeight, top: viewport.scrollTop };
      void messagesQuery.fetchNextPage();
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [messagesQuery]);

  const handleSelectChat = (chat: WhatsappInboxChat) => {
    setSelectedChat(chat);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedChat || !draft.trim() || !canSend) return;

    const text = draft.trim();
    setDraft("");
    setIsSending(true);
    shouldScrollMessagesToBottomRef.current = true;
    const optimisticMessage: WhatsappInboxMessage = {
      id: `optimistic-${Date.now()}`,
      remoteJid: selectedChat.remoteJid,
      fromMe: true,
      text,
      senderName: null,
      timestamp: new Date().toISOString(),
      status: "PENDING",
    };

    queryClient.setQueryData<InfiniteData<WhatsappInboxMessagesResponse>>(messagesQueryKey, (current) => {
      if (!current) {
        return { pages: [{ items: [optimisticMessage], nextCursor: null, raw: null }], pageParams: [0] };
      }

      const pages = [...current.pages];
      const lastPage = pages[pages.length - 1];
      if (!lastPage) return current;
      pages[pages.length - 1] = { ...lastPage, items: [...lastPage.items, optimisticMessage] };
      return { ...current, pages };
    });

    try {
      const result = await sendWhatsappInboxMessage(tokoId, selectedChat.remoteJid, selectedChat.alternateJid, text);
      if (result.success && result.data) {
        const sentMessage = result.data.message;
        queryClient.setQueryData<InfiniteData<WhatsappInboxMessagesResponse>>(messagesQueryKey, (current) => {
          if (!current) return { pages: [{ items: [sentMessage], nextCursor: null, raw: null }], pageParams: [0] };

          const pages = [...current.pages];
          const lastPage = pages[pages.length - 1];
          if (!lastPage) return current;
          pages[pages.length - 1] = { ...lastPage, items: lastPage.items.map((message) => message.id === optimisticMessage.id ? sentMessage : message) };
          return { ...current, pages };
        });
        recordDebug("sendText response", result.data.raw);
        void queryClient.invalidateQueries({ queryKey: chatsQueryKey });
      } else {
        setDraft(text);
        queryClient.setQueryData<InfiniteData<WhatsappInboxMessagesResponse>>(messagesQueryKey, (current) => {
          if (!current) return current;
          return { ...current, pages: current.pages.map((page) => ({ ...page, items: page.items.filter((message) => message.id !== optimisticMessage.id) })) };
        });
        recordDebug("sendText error", result);
        toast.error(result.error || "Gagal mengirim pesan WhatsApp");
      }
    } catch (error) {
      setDraft(text);
      queryClient.setQueryData<InfiniteData<WhatsappInboxMessagesResponse>>(messagesQueryKey, (current) => {
        if (!current) return current;
        return { ...current, pages: current.pages.map((page) => ({ ...page, items: page.items.filter((message) => message.id !== optimisticMessage.id) })) };
      });
      recordDebug("sendText exception", error instanceof Error ? error.message : String(error));
      toast.error("Gagal mengirim pesan WhatsApp");
    } finally {
      setIsSending(false);
    }
  };

  if (!canView) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-lg" className="relative text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" aria-label="Buka WhatsApp inbox">
          <RiWhatsappLine className="size-4" />
          {whatsappRealtime.status === "connected" && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-emerald-500" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(54rem,calc(100vw-1rem))] p-0 sm:min-w-[54rem]" onOpenAutoFocus={(event) => event.preventDefault()}>
        <div className="flex h-[40rem] max-h-[calc(100vh-6rem)] flex-col overflow-hidden">
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden sm:grid-cols-[18rem_1fr]">
          <aside className="flex min-h-0 flex-col border-b sm:border-b-0 sm:border-r">
            <div className="flex items-center justify-between gap-2 border-b p-3">
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  <RiWhatsappLine className="size-4 text-emerald-600" />
                  WhatsApp Inbox
                </div>
                <p className="text-[11px] text-muted-foreground">{whatsappRealtime.status === "connected" ? "Realtime aktif" : "Realtime belum aktif"}</p>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-1 p-2">
                {isCheckingPairing ? (
                  <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                    <RiLoader4Line className="size-3.5 animate-spin" />
                    Memeriksa pairing WhatsApp...
                  </div>
                ) : isWhatsappNotPaired ? (
                  <div className="rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <RiWhatsappLine className="size-4 text-emerald-600" />
                      WhatsApp belum dipairing
                    </div>
                    <p className="mt-1 leading-relaxed">Pairing WhatsApp toko dengan QR dulu untuk membuka inbox dan menerima pesan realtime.</p>
                    {canManageSettings ? (
                      <Button asChild size="sm" className="mt-3 w-full">
                        <Link href={`/${tokoId}/admin?settings=whatsapp`}>
                          <RiQrCodeLine data-icon="inline-start" />
                          Pairing WhatsApp
                        </Link>
                      </Button>
                    ) : (
                      <p className="mt-2 text-[11px]">Hubungi admin toko untuk pairing WhatsApp.</p>
                    )}
                  </div>
                ) : isLoadingChats && chats.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                    <RiLoader4Line className="size-3.5 animate-spin" />
                    Memuat chat...
                  </div>
                ) : chats.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Belum ada chat WhatsApp.</div>
                ) : chats.map((chat) => (
                  <button
                    key={getChatIdentityKey(chat)}
                    type="button"
                    onClick={() => handleSelectChat(chat)}
                    className={cn(
                      "relative flex w-full min-w-0 items-start gap-2 rounded-lg p-2 text-left text-xs transition-colors hover:bg-muted/70",
                      selectedChat && getChatIdentityKey(selectedChat) === getChatIdentityKey(chat) && "bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/20",
                    )}
                  >
                      <Avatar data-size="default" className="size-8 bg-emerald-500/10">
                        {chat.profilePictureUrl ? <AvatarImage src={chat.profilePictureUrl} alt={getChatDisplayName(chat)} /> : null}
                        <AvatarFallback className="bg-emerald-500/10 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          <RiUserLine className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className={cn("flex items-center justify-between gap-2", chat.linkedService && "pr-24")}>
                        <span className="truncate font-medium">{getChatDisplayName(chat)}</span>
                        {!chat.linkedService ? <span className="shrink-0 text-[10px] text-muted-foreground">{formatChatTime(chat.lastMessageAt)}</span> : null}
                      </span>
                      {chat.linkedService ? (
                        <ServiceDeviceBadges service={chat.linkedService} showStatus={false} className="absolute right-2 top-2 max-w-[50%]" />
                      ) : null}
                      <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {chat.lastMessage ?? (chat.number ? `+${chat.number}` : chat.alternateJid ?? chat.remoteJid)}
                      </span>
                    </span>
                    {chat.unreadCount > 0 && <Badge variant="success" className="h-5 px-1.5 text-[10px]">{chat.unreadCount}</Badge>}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          <section className="flex min-h-0 flex-col">
            {isCheckingPairing ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                <RiLoader4Line className="size-8 animate-spin text-emerald-600" />
                <p>Memeriksa status pairing WhatsApp...</p>
              </div>
            ) : isWhatsappNotPaired ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                <div className="rounded-full bg-emerald-500/10 p-4">
                  <RiWhatsappLine className="size-10 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Inbox belum aktif</p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed">Pairing WhatsApp toko melalui QR sebelum menggunakan inbox terintegrasi.</p>
                </div>
                {canManageSettings ? (
                  <Button asChild size="sm">
                    <Link href={`/${tokoId}/admin?settings=whatsapp`}>
                      <RiQrCodeLine data-icon="inline-start" />
                      Buka Pengaturan WhatsApp
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : selectedChat ? (
              <>
                <div className="flex items-start justify-between gap-3 border-b p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{getChatDisplayName(selectedChat)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{selectedChat.number ? `+${selectedChat.number}` : selectedChat.alternateJid ?? selectedChat.remoteJid}</p>
                  </div>
                  <div className="min-w-0 max-w-[50%] text-right">
                    {selectedChat.linkedService ? (
                      <ServiceDeviceBadges service={selectedChat.linkedService} className="justify-end" />
                    ) : null}
                  </div>
                </div>
                <ScrollArea ref={messagesScrollAreaRef} className="min-h-0 flex-1 bg-muted/20">
                  <div className="flex flex-col gap-2 p-3">
                    {messagesQuery.isFetchingNextPage ? (
                      <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-muted-foreground">
                        <RiLoader4Line className="size-3 animate-spin" />
                        Memuat pesan lama...
                      </div>
                    ) : null}
                    {isLoadingMessages && messages.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
                        <RiLoader4Line className="size-3.5 animate-spin" />
                        Memuat pesan...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="rounded-lg border border-dashed bg-background p-4 text-center text-xs text-muted-foreground">Belum ada pesan pada chat ini.</div>
                    ) : messages.map((message) => {
                      const isMultiLine = message.text.includes("\n") || message.text.length > 48;
                      return (
                        <div key={message.id} className={cn("flex", message.fromMe ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[78%] rounded-md px-3 py-2 text-xs shadow-sm",
                            message.fromMe ? "rounded-br-[2px] bg-emerald-700 text-white" : "rounded-bl-[2px] bg-background ring-1 ring-border/60",
                          )}
                          >
                            {isMultiLine ? (
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {message.text}
                                <MessageTimestamp message={message} className="float-right ml-2 translate-y-0.5 leading-relaxed" />
                              </p>
                            ) : (
                              <div className="flex items-end gap-2">
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                                <MessageTimestamp message={message} className="shrink-0" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
                  <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={canSend ? "Tulis pesan..." : "Tidak punya izin kirim pesan"} disabled={!canSend || isSending} />
                  <Button type="submit" disabled={!canSend || isSending || !draft.trim()}>
                    {isSending ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : <RiSendPlane2Line data-icon="inline-start" />}
                    Kirim
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
                <RiWhatsappLine className="size-10 text-emerald-600/70" />
                <p className="font-medium text-foreground">Pilih chat WhatsApp</p>
                <p className="max-w-xs text-xs">Chat dari Evolution API akan tampil di sini. Pesan baru akan me-refresh daftar saat realtime aktif.</p>
              </div>
            )}
          </section>
        </div>
        {WHATSAPP_CLIENT_DEBUG ? <div className="border-t bg-muted/20 p-2">
          <details className="group">
            <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground group-open:text-foreground">
              Evolution API response debug ({debugEntries.length})
            </summary>
            <ScrollArea className="mt-2 max-h-32 rounded-md border bg-background">
              <div className="space-y-2 p-2">
                {debugEntries.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Belum ada response. Buka refresh chat, pilih chat, kirim pesan, atau tunggu event realtime.</p>
                ) : debugEntries.map((entry) => (
                  <div key={`${entry.label}-${entry.at}`} className="rounded-md bg-muted/30 p-2">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-foreground">{entry.label}</span>
                      <span className="text-muted-foreground">{formatChatTime(new Date(entry.at).toISOString())}</span>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-muted-foreground">{entry.text}</pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </details>
        </div> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
