const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

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

export async function evolutionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getEvolutionUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY!,
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = await parseEvolutionResponse(response);

  if (!response.ok) {
    throw new Error(`Evolution API ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }

  return body as T;
}

export async function createWhatsappInstance(instanceName: string): Promise<unknown> {
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
