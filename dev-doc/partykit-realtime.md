# PartyKit Realtime

PartyKit is used as a separate WebSocket service for service-screen refresh events. The Next.js app can run on the VPS as usual, but the realtime server is deployed with PartyKit or PartyKit cloud-prem on Cloudflare.

## Local Development

Run Next.js:

```bash
bun run dev
```

Run PartyKit in another shell:

```bash
bun run dev:realtime
```

Set this in the local environment used by Next.js:

```env
NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:1999
```

## VPS Deployment

Deploy the realtime server:

```bash
bun run deploy:realtime
```

Set this on the VPS before building/running Next.js:

```env
NEXT_PUBLIC_PARTYKIT_HOST=rms-v2-realtime.<github-user>.partykit.dev
```

Do not include `https://` or `wss://` when using `partysocket`.

## Current Event Model

The dashboard layout opens one PartyKit connection per `toko-${tokoId}` room. Service pages publish a `service.changed` event after successful mutations. Other clients connected to the same room receive the event and call `router.refresh()`.

Events include lightweight metadata for the dashboard header:

```json
{
  "type": "service.changed",
  "tokoId": "...",
  "action": "updated",
  "serviceId": "...",
  "serviceLabel": "Customer - Brand Model",
  "actor": { "id": "...", "name": "...", "role": "admin" },
  "sentAt": 1778206854527
}
```

The header uses this metadata to show the realtime connection status, the latest service action, and a short syncing indicator while the route is refreshed from the server.

Prisma remains the source of truth. PartyKit is only a fan-out transport for refresh notifications.

## Mobile Scanner Rooms

Phone scanner pairing uses PartyKit rooms named `scanner-<code>`. The desktop creates a short-lived scanner session through `/api/mobile-scanner/signal`, then joins the room as `scanner.host-init`. The phone joins from the QR link as `scanner.guest-init`; after a successful QR pairing, the phone stores a device token and can ask `/api/mobile-scanner/signal` for the latest active desktop session.

Scanner rooms route messages only between the authenticated host and guest connection IDs. The phone still performs camera access and barcode decoding locally; PartyKit only carries pairing messages and `scan` payloads.
