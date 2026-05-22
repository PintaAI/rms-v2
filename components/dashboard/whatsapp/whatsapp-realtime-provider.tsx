"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RiNotification3Line, RiWhatsappLine } from "@remixicon/react";
import { toast } from "sonner";
import { getWhatsappInboxChats, type WhatsappInboxChat } from "@/actions/whatsapp";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import { useWhatsappEvolutionRealtime, type EvolutionRealtimePayload } from "@/hooks/use-whatsapp-evolution-realtime";

type WhatsappRealtimeValue = ReturnType<typeof useWhatsappEvolutionRealtime>;
interface WhatsappOpenChatRequest {
  id: number;
  remoteJid: string | null;
  alternateJid: string | null;
}

interface WhatsappRealtimeContextValue {
  realtime: WhatsappRealtimeValue;
  openChatRequest: WhatsappOpenChatRequest | null;
  requestOpenChat: (target: Omit<WhatsappOpenChatRequest, "id">) => void;
  setInboxOpen: (open: boolean) => void;
  markChatRead: (chat: WhatsappInboxChat) => void;
  isChatRead: (chat: WhatsappInboxChat) => boolean;
}

const WhatsappRealtimeContext = React.createContext<WhatsappRealtimeContextValue | null>(null);
const DISABLED_WHATSAPP_REALTIME: WhatsappRealtimeValue = {
  status: "disabled",
  eventHistory: [],
  error: null,
};
const DISABLED_WHATSAPP_REALTIME_CONTEXT: WhatsappRealtimeContextValue = {
  realtime: DISABLED_WHATSAPP_REALTIME,
  openChatRequest: null,
  requestOpenChat: () => undefined,
  setInboxOpen: () => undefined,
  markChatRead: () => undefined,
  isChatRead: () => false,
};

interface IncomingWhatsappMessage {
  id: string | null;
  remoteJid: string | null;
  alternateJid: string | null;
  senderName: string;
  text: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function getString(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function getMessageText(message: Record<string, unknown> | null) {
  if (!message) return null;
  if (typeof message.conversation === "string") return message.conversation;

  for (const key of ["extendedTextMessage", "imageMessage", "videoMessage", "documentMessage", "audioMessage"] as const) {
    const nested = asRecord(message[key]);
    const text = getString(nested, ["text", "caption", "fileName"]);
    if (text) return text;
  }

  if (message.stickerMessage) return "[Sticker]";
  if (message.audioMessage) return "[Audio]";
  if (message.imageMessage) return "[Gambar]";
  if (message.videoMessage) return "[Video]";
  if (message.documentMessage) return "[Dokumen]";
  return "[Pesan tidak didukung]";
}

function getIncomingWhatsappMessages(payload: EvolutionRealtimePayload | undefined): IncomingWhatsappMessage[] {
  const records = Array.isArray(payload?.data) ? payload.data : [payload?.data];

  return records.flatMap((item) => {
    const record = asRecord(item);
    const key = asRecord(record?.key);
    if (!record || key?.fromMe === true || record.fromMe === true) return [];

    const text = getMessageText(asRecord(record.message));
    if (!text) return [];

    return [{
      id: getString(key, ["id"]) ?? getString(record, ["id", "messageId"]),
      remoteJid: getString(key, ["remoteJid"]) ?? getString(record, ["remoteJid", "jid"]),
      alternateJid: getString(record, ["remoteJidAlt", "senderPn", "phoneJid", "jidAlt", "previousRemoteJid", "lidJid"])
        ?? getString(key, ["remoteJidAlt", "senderPn", "phoneJid", "jidAlt", "previousRemoteJid", "lidJid"]),
      senderName: getString(record, ["pushName", "participant", "sender"]) ?? "WhatsApp",
      text,
    }];
  });
}

function getChatIdentityKey(chat: WhatsappInboxChat) {
  return chat.number ?? chat.alternateJid ?? chat.remoteJid;
}

function getChatNotificationKey(chat: WhatsappInboxChat) {
  return `${getChatIdentityKey(chat)}:${chat.lastMessageAt ?? ""}:${chat.lastMessage ?? ""}`;
}

function chatToIncomingMessage(chat: WhatsappInboxChat): IncomingWhatsappMessage | null {
  if (!chat.lastMessage) return null;

  return {
    id: getChatNotificationKey(chat),
    remoteJid: chat.remoteJid,
    alternateJid: chat.alternateJid,
    senderName: chat.linkedService?.customerName?.trim() || chat.name || "WhatsApp",
    text: chat.lastMessage,
  };
}

function WhatsappMessageToast({ senderName, text, onOpen }: { senderName: string; text: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-emerald-500/20 bg-popover p-4 text-left text-popover-foreground shadow-lg outline-none transition-all duration-200 hover:scale-[1.02] hover:border-emerald-500/40 hover:bg-popover focus-visible:ring-2 focus-visible:ring-emerald-500/40"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <RiWhatsappLine className="size-5" />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <span>WhatsApp notification</span>
          <RiNotification3Line className="size-3.5 shrink-0" />
        </span>
        <span className="block text-sm font-semibold leading-snug">{senderName}</span>
        <span className="block line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

export function WhatsappRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { tokoId, featureAccess, permissionAccess } = useDashboardScope();
  const queryClient = useQueryClient();
  const processedMessageIdsRef = React.useRef(new Set<string>());
  const seenChatKeysRef = React.useRef(new Set<string>());
  const readChatMarkersRef = React.useRef(new Map<string, string>());
  const hasInitializedPollingRef = React.useRef(false);
  const [openChatRequest, setOpenChatRequest] = React.useState<WhatsappOpenChatRequest | null>(null);
  const [inboxOpen, setInboxOpen] = React.useState(false);
  const canView = Boolean(featureAccess["whatsapp.integration"] && permissionAccess["whatsapp.view"]);
  const whatsappRealtime = useWhatsappEvolutionRealtime({ tokoId, enabled: canView && inboxOpen });
  const latestRealtimeEvent = whatsappRealtime.eventHistory[0];
  const requestOpenChat = React.useCallback((target: Omit<WhatsappOpenChatRequest, "id">) => {
    setOpenChatRequest({ ...target, id: Date.now() });
  }, []);
  const markChatRead = React.useCallback((chat: WhatsappInboxChat) => {
    readChatMarkersRef.current.set(getChatIdentityKey(chat), getChatNotificationKey(chat));
  }, []);
  const isChatRead = React.useCallback((chat: WhatsappInboxChat) => {
    return readChatMarkersRef.current.get(getChatIdentityKey(chat)) === getChatNotificationKey(chat);
  }, []);

  const notificationChatsQuery = useQuery({
    queryKey: ["whatsapp", "notification-chats", tokoId],
    enabled: canView && !inboxOpen,
    queryFn: async () => {
      const result = await getWhatsappInboxChats(tokoId, { limit: 10 });
      if (!result.success || !result.data) return [];
      return result.data.items;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 20_000,
  });

  React.useEffect(() => {
    if (!inboxOpen) return;
    hasInitializedPollingRef.current = false;
  }, [inboxOpen]);

  React.useEffect(() => {
    if (!canView || inboxOpen || !notificationChatsQuery.data) return;

    const nextKeys = new Set(notificationChatsQuery.data.map(getChatNotificationKey));
    if (!hasInitializedPollingRef.current) {
      seenChatKeysRef.current = nextKeys;
      hasInitializedPollingRef.current = true;
      return;
    }

    for (const chat of notificationChatsQuery.data) {
      const notificationKey = getChatNotificationKey(chat);
      if (seenChatKeysRef.current.has(notificationKey)) continue;
      if (isChatRead(chat)) {
        seenChatKeysRef.current.add(notificationKey);
        continue;
      }

      const message = chatToIncomingMessage(chat);
      if (!message) continue;

      seenChatKeysRef.current.add(notificationKey);
      if (seenChatKeysRef.current.size > 100) {
        seenChatKeysRef.current = new Set(Array.from(seenChatKeysRef.current).slice(-50));
      }

      const openChat = () => requestOpenChat({ remoteJid: message.remoteJid, alternateJid: message.alternateJid });
      toast.custom((toastId) => (
        <WhatsappMessageToast
          senderName={message.senderName}
          text={message.text}
          onOpen={() => {
            toast.dismiss(toastId);
            openChat();
          }}
        />
      ), {
        duration: 10000,
        position: "bottom-right",
      });
    }
  }, [canView, inboxOpen, isChatRead, notificationChatsQuery.data, requestOpenChat]);

  React.useEffect(() => {
    if (!canView || whatsappRealtime.status !== "connected") return;
    if (!latestRealtimeEvent || latestRealtimeEvent.event !== "messages.upsert") return;

    const incomingMessages = getIncomingWhatsappMessages(latestRealtimeEvent.payload);
    if (incomingMessages.length === 0) return;

    void queryClient.invalidateQueries({ queryKey: ["whatsapp", "chats", tokoId] });
    void queryClient.invalidateQueries({ queryKey: ["whatsapp", "messages", tokoId] });

    for (const message of incomingMessages) {
      const dedupeKey = message.id ?? `${latestRealtimeEvent.sentAt}:${message.senderName}:${message.text}`;
      if (processedMessageIdsRef.current.has(dedupeKey)) continue;

      processedMessageIdsRef.current.add(dedupeKey);
      if (processedMessageIdsRef.current.size > 100) {
        processedMessageIdsRef.current = new Set(Array.from(processedMessageIdsRef.current).slice(-50));
      }

      const openChat = () => requestOpenChat({ remoteJid: message.remoteJid, alternateJid: message.alternateJid });
      toast.custom((toastId) => (
        <WhatsappMessageToast
          senderName={message.senderName}
          text={message.text}
          onOpen={() => {
            toast.dismiss(toastId);
            openChat();
          }}
        />
      ), {
        duration: 10000,
        position: "bottom-right",
      });
    }
  }, [canView, latestRealtimeEvent, queryClient, requestOpenChat, tokoId, whatsappRealtime.status]);

  const value = React.useMemo<WhatsappRealtimeContextValue>(() => ({
    realtime: whatsappRealtime,
    openChatRequest,
    requestOpenChat,
    setInboxOpen,
    markChatRead,
    isChatRead,
  }), [isChatRead, markChatRead, openChatRequest, requestOpenChat, setInboxOpen, whatsappRealtime]);

  return (
    <WhatsappRealtimeContext.Provider value={value}>
      {children}
    </WhatsappRealtimeContext.Provider>
  );
}

export function useDashboardWhatsappRealtime() {
  return React.useContext(WhatsappRealtimeContext) ?? DISABLED_WHATSAPP_REALTIME_CONTEXT;
}
