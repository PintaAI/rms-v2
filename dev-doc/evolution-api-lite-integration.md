# Evolution API Lite Integration Guide

This app uses the self-hosted Evolution API Lite deployment for WhatsApp connectivity.

## Deployment

Base URL:

```text
https://rmspinta.duckdns.org
```

Health check:

```bash
curl https://rmspinta.duckdns.org/
```

Expected response:

```json
{
  "status": 200,
  "message": "Welcome to the Evolution API, it is working!",
  "version": "2.2.1"
}
```

## Authentication

Authenticated endpoints require the global API key in the `apikey` header.

Do not expose this key to browser/client components. Keep it server-side only.

Recommended app environment variables:

```env
EVOLUTION_API_URL=https://rmspinta.duckdns.org
EVOLUTION_API_KEY=replace-with-key-from-vps
```

The active key is stored on the VPS at:

```text
/opt/evolution-api-lite/.env
```

To verify the key works:

```bash
curl https://rmspinta.duckdns.org/instance/fetchInstances \
  -H "apikey: $EVOLUTION_API_KEY"
```

`200 []` means the key works and there are no instances yet. `401 Unauthorized` means the key is missing or wrong.

## Next.js Usage Pattern

Call Evolution API from server code only: route handlers, server actions, or server utilities. Do not call it directly from React client components because the API key would be exposed.

Minimal server helper:

```ts
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

export async function evolutionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error("Evolution API environment variables are not configured");
  }

  const response = await fetch(`${EVOLUTION_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Evolution API ${response.status}: ${JSON.stringify(body)}`);
  }

  return body as T;
}
```

## Common Endpoints

### Fetch Instances

Lists configured WhatsApp instances.

```http
GET /instance/fetchInstances
```

Example:

```ts
const instances = await evolutionFetch<unknown[]>("/instance/fetchInstances");
```

### Create Instance

Creates a WhatsApp instance. Use one instance per connected WhatsApp account.

```http
POST /instance/create
```

Body:

```json
{
  "instanceName": "rms-main",
  "integration": "WHATSAPP-BAILEYS",
  "qrcode": true,
  "groupsIgnore": true,
  "alwaysOnline": false,
  "readMessages": false,
  "readStatus": false,
  "syncFullHistory": false
}
```

Example:

```ts
const instance = await evolutionFetch("/instance/create", {
  method: "POST",
  body: JSON.stringify({
    instanceName: "rms-main",
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    groupsIgnore: true,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false,
  }),
});
```

### Connect Instance

Gets the QR/pairing data needed to connect WhatsApp.

```http
GET /instance/connect/{instanceName}
```

Example:

```ts
const qr = await evolutionFetch("/instance/connect/rms-main");
```

Optional phone-number pairing:

```http
GET /instance/connect/{instanceName}?number=6281234567890
```

### Check Connection State

Checks whether the WhatsApp instance is connected.

```http
GET /instance/connectionState/{instanceName}
```

Example:

```ts
const state = await evolutionFetch("/instance/connectionState/rms-main");
```

Typical connected state is `open`.

### Send Text Message

Sends a WhatsApp text message.

```http
POST /message/sendText/{instanceName}
```

Body:

```json
{
  "number": "6281234567890",
  "text": "Hello from RMS",
  "delay": 1200,
  "linkPreview": false
}
```

Example:

```ts
const sent = await evolutionFetch("/message/sendText/rms-main", {
  method: "POST",
  body: JSON.stringify({
    number: "6281234567890",
    text: "Hello from RMS",
    delay: 1200,
    linkPreview: false,
  }),
});
```

Phone numbers should include country code and no leading `+`.

## Webhooks

Use webhooks if the app needs incoming message events, QR updates, or connection updates.

Suggested Next.js route:

```text
POST /api/evolution/webhook
```

Public webhook URL:

```text
https://<app-domain>/api/evolution/webhook
```

Configure webhook for an instance:

```http
POST /webhook/set/{instanceName}
```

Body:

```json
{
  "enabled": true,
  "url": "https://<app-domain>/api/evolution/webhook",
  "webhookByEvents": false,
  "webhookBase64": false,
  "events": [
    "QRCODE_UPDATED",
    "CONNECTION_UPDATE",
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "SEND_MESSAGE"
  ]
}
```

Add your own webhook secret header at the app layer if this endpoint receives sensitive updates. Evolution Lite can also pass headers during instance creation using the `webhook.headers` object.

## Recommended RMS Flow

1. Admin creates or selects an Evolution instance for a store.
2. Server action calls `POST /instance/create` if the instance does not exist.
3. UI shows QR/pairing data from `GET /instance/connect/{instanceName}`.
4. App polls `GET /instance/connectionState/{instanceName}` until state is `open`.
5. App sends WhatsApp messages from server code through `POST /message/sendText/{instanceName}`.
6. Optional: webhook route records incoming messages and delivery updates.

## Safety Notes

- Never store `EVOLUTION_API_KEY` in `NEXT_PUBLIC_*` variables.
- Never call Evolution API directly from client components.
- Validate phone numbers before sending messages.
- Keep per-store instance names deterministic, for example `rms-store-${tokoid}`.
- Store only the instance name in app data; keep the global API key in environment variables.
- Treat webhook payloads as untrusted input and validate before writing to the database.

## Operations

VPS deployment directory:

```bash
cd /opt/evolution-api-lite
```

Useful commands:

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f caddy
docker compose restart api
docker compose up -d
```

Rotate the API key by updating `AUTHENTICATION_API_KEY` in `/opt/evolution-api-lite/.env`, then restart the API:

```bash
cd /opt/evolution-api-lite
docker compose up -d --force-recreate api
```
