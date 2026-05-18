const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_DEBUG = process.env.EVOLUTION_DEBUG === "true";

const WHATSAPP_WEBSOCKET_EVENTS = [
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
  "QRCODE_UPDATED",
] as const;

export type WhatsappWebsocketEvent = (typeof WHATSAPP_WEBSOCKET_EVENTS)[number];

export interface CreateWhatsappInstanceResponse {
  instance?: {
    instanceName?: string;
    instanceId?: string;
    integration?: string;
    status?: string;
  };
  hash?: string;
  qrcode?: unknown;
  websocket?: unknown;
}

function getEvolutionUrl(path: string) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error("Evolution API environment variables are not configured");
  }

  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

async function parseEvolutionResponse(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function redactEvolutionLogValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[Max depth]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactEvolutionLogValue(item, depth + 1));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("apikey") || lowerKey.includes("token") || lowerKey.includes("hash")) {
      return [key, "[REDACTED]"];
    }

    return [key, redactEvolutionLogValue(entry, depth + 1)];
  }));
}

export async function evolutionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(getEvolutionUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY!,
        ...init?.headers,
      },
      cache: "no-store",
      signal: init?.signal ?? controller.signal,
    });

    const body = await parseEvolutionResponse(response);
    if (EVOLUTION_DEBUG) {
      console.log("[Evolution API]", {
        method: init?.method ?? "GET",
        path,
        status: response.status,
        ok: response.ok,
        durationMs: Date.now() - startedAt,
        response: redactEvolutionLogValue(body),
      });
    }

    if (!response.ok) {
      throw new Error(`Evolution API ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    }

    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Evolution API timeout after ${Date.now() - startedAt}ms: ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getEvolutionPublicUrl() {
  if (!EVOLUTION_API_URL) {
    throw new Error("Evolution API URL is not configured");
  }

  return EVOLUTION_API_URL.replace(/\/$/, "");
}

export async function createWhatsappInstance(instanceName: string): Promise<CreateWhatsappInstanceResponse> {
  return evolutionFetch("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
    }),
  });
}

export async function setWhatsappWebsocket(input: {
  instanceName: string;
  enabled?: boolean;
  events?: readonly WhatsappWebsocketEvent[];
}): Promise<unknown> {
  return evolutionFetch(`/websocket/set/${encodeURIComponent(input.instanceName)}`, {
    method: "POST",
    body: JSON.stringify({
      websocket: {
        enabled: input.enabled ?? true,
        events: [...(input.events ?? WHATSAPP_WEBSOCKET_EVENTS)],
      },
    }),
  });
}

export async function connectWhatsappInstance(instanceName: string): Promise<unknown> {
  return evolutionFetch(`/instance/connect/${encodeURIComponent(instanceName)}`);
}

export async function getWhatsappConnectionState(instanceName: string): Promise<unknown> {
  return evolutionFetch(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
}

export async function fetchWhatsappInstances(): Promise<unknown[]> {
  return evolutionFetch("/instance/fetchInstances");
}

export async function deleteWhatsappInstance(instanceName: string): Promise<unknown> {
  return evolutionFetch(`/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  });
}

export async function sendWhatsappText(input: {
  instanceName: string;
  number: string;
  text: string;
}): Promise<unknown> {
  return evolutionFetch(`/message/sendText/${encodeURIComponent(input.instanceName)}`, {
    method: "POST",
    body: JSON.stringify({
      number: input.number,
      text: input.text,
      delay: 1200,
      linkPreview: false,
    }),
  });
}

export async function findWhatsappChats(instanceName: string, limit = 50, offset = 0): Promise<unknown> {
  return evolutionFetch(`/chat/findChats/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({ limit, offset }),
  });
}

export async function findWhatsappMessages(input: {
  instanceName: string;
  remoteJid: string;
  limit?: number;
  offset?: number;
}): Promise<unknown> {
  return evolutionFetch(`/chat/findMessages/${encodeURIComponent(input.instanceName)}`, {
    method: "POST",
    body: JSON.stringify({
      limit: input.limit ?? 100,
      offset: input.offset ?? 0,
      where: {
        key: {
          remoteJid: input.remoteJid,
        },
      },
    }),
  });
}

export async function findWhatsappContacts(instanceName: string): Promise<unknown> {
  return evolutionFetch(`/chat/findContacts/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({ where: {} }),
  });
}

export async function checkWhatsappNumbers(input: {
  instanceName: string;
  numbers: string[];
}): Promise<unknown> {
  return evolutionFetch(`/chat/whatsappNumbers/${encodeURIComponent(input.instanceName)}`, {
    method: "POST",
    body: JSON.stringify({ numbers: input.numbers }),
  });
}

export async function fetchWhatsappProfilePictureUrl(input: {
  instanceName: string;
  remoteJid: string;
}): Promise<unknown> {
  return evolutionFetch(`/chat/fetchProfilePictureUrl/${encodeURIComponent(input.instanceName)}`, {
    method: "POST",
    body: JSON.stringify({ number: input.remoteJid }),
  });
}
