# WhatsApp Per-Toko Implementation Plan

## Goal

Each toko can connect its own WhatsApp account through Evolution API Lite. When a service status changes to `done` or `failed`, RMS automatically sends a WhatsApp message to the customer from that toko's connected WhatsApp account.

## Non-Goals

- No customer-side WhatsApp linking.
- No browser/client direct calls to Evolution API.
- No webhook requirement for the first version.
- No guaranteed retry queue in the first version unless we explicitly add an outbox table.

## Existing Context

- Evolution API Lite deployment is documented in `dev-doc/evolution-api-lite-integration.md`.
- Service status changes happen in `actions/service-mutations.ts` through `updateStatus()`.
- Completing statuses are already centralized in `actions/service-shared.ts` through `isCompletingStatus()`.
- `Service` already has `doneNotifiedAt`, which can be used as the first anti-duplicate notification guard.
- Customer WhatsApp number is stored as `Service.noWa`.

## Environment Variables

Add these server-only variables to local and deployment environments:

```env
EVOLUTION_API_URL=https://rmspinta.duckdns.org
EVOLUTION_API_KEY=replace-with-key-from-vps
```

Rules:

- Never expose the API key through `NEXT_PUBLIC_*`.
- Never call Evolution API from client components.
- All Evolution calls must happen from server actions or server utilities.

## Data Model

Add a per-toko WhatsApp setting table.

```prisma
model TokoWhatsappSetting {
  tokoId String @id

  instanceName    String  @unique
  enabled         Boolean @default(true)
  connectionState String?
  connectedNumber String?

  notifyDone   Boolean @default(true)
  notifyFailed Boolean @default(true)

  doneMessageTemplate   String?
  failedMessageTemplate String?

  lastConnectedAt DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  toko Toko @relation(fields: [tokoId], references: [id], onDelete: Cascade)

  @@map("toko_whatsapp_setting")
}
```

Add this relation to `Toko`:

```prisma
whatsappSetting TokoWhatsappSetting?
```

Instance naming must be deterministic:

```ts
const instanceName = `rms-store-${tokoId}`;
```

This keeps one Evolution instance per toko and avoids storing credentials in the database.

## Server Utility

Create `lib/evolution.ts`.

Responsibilities:

- Read `EVOLUTION_API_URL` and `EVOLUTION_API_KEY` from `process.env`.
- Set the `apikey` header.
- Use `cache: "no-store"`.
- Parse JSON responses safely.
- Throw clear server-side errors for failed Evolution responses.

Suggested functions:

```ts
export async function evolutionFetch<T>(path: string, init?: RequestInit): Promise<T>;
export async function createWhatsappInstance(instanceName: string): Promise<unknown>;
export async function connectWhatsappInstance(instanceName: string): Promise<unknown>;
export async function getWhatsappConnectionState(instanceName: string): Promise<unknown>;
export async function sendWhatsappText(input: {
  instanceName: string;
  number: string;
  text: string;
}): Promise<unknown>;
```

Create instance payload:

```json
{
  "instanceName": "rms-store-<tokoId>",
  "integration": "WHATSAPP-BAILEYS",
  "qrcode": true,
  "groupsIgnore": true,
  "alwaysOnline": false,
  "readMessages": false,
  "readStatus": false,
  "syncFullHistory": false
}
```

## Server Actions

Create `actions/whatsapp.ts`.

Actions:

- `getTokoWhatsappSetting(tokoId)`
- `createOrConnectTokoWhatsapp(tokoId)`
- `refreshTokoWhatsappConnection(tokoId)`
- `updateTokoWhatsappSetting(tokoId, input)`

Optional later:

- `disconnectTokoWhatsapp(tokoId)`
- `sendTestWhatsappMessage(tokoId, number)`

Access rules:

- User must be authenticated.
- User must be `admin`.
- User must have access to the requested toko through `canAccessToko(user, tokoId)`.

Connection flow in `createOrConnectTokoWhatsapp(tokoId)`:

1. Validate auth and toko access.
2. Upsert `TokoWhatsappSetting` with deterministic `instanceName`.
3. Call Evolution `POST /instance/create`.
4. Ignore or normalize the Evolution error if the instance already exists.
5. Call Evolution `GET /instance/connect/{instanceName}`.
6. Return QR or pairing data to the UI.

Refresh flow in `refreshTokoWhatsappConnection(tokoId)`:

1. Load the toko WhatsApp setting.
2. Call Evolution `GET /instance/connectionState/{instanceName}`.
3. Store the latest `connectionState`.
4. If state is `open`, set `lastConnectedAt`.
5. Return the updated setting.

## Settings UI

Add a new user settings tab in `components/ui/user-settings.tsx`:

```ts
export type SettingsTab = "profile" | "features" | "whatsapp" | "password" | "billing" | "premium" | "appearance";
```

Add a menu item labeled `WhatsApp`.

Create a client component such as:

```text
components/dashboard/admin/whatsapp-settings-tab.tsx
```

UI capabilities:

- Show current toko name.
- Show connection state: `connected`, `disconnected`, `connecting`, or `unknown`.
- Button: `Connect WhatsApp`.
- Button: `Refresh Status`.
- QR code display area after connect action.
- Toggle: notify when service is done.
- Toggle: notify when service failed.
- Textarea for done template.
- Textarea for failed template.

QR scan instructions shown in UI:

```text
Open WhatsApp on your phone > Linked devices > Link a device > Scan this QR code.
```

The connected WhatsApp number belongs to the toko/admin account. Customers do not scan anything.

## Notification Helper

Create a server helper, for example `lib/service-whatsapp-notifications.ts`.

Suggested function:

```ts
export async function sendServiceStatusWhatsappNotification(input: {
  serviceId: string;
  status: "done" | "failed";
}): Promise<void>;
```

Behavior:

1. Load service with:
   - `id`
   - `tokoId`
   - `customerName`
   - `noWa`
   - `status`
   - `doneNotifiedAt`
   - `hpCatalog.brand.name`
   - `hpCatalog.modelName`
   - `toko.name`
   - `toko.whatsappSetting`
2. Return early if `doneNotifiedAt` is already set.
3. Return early if toko WhatsApp setting does not exist.
4. Return early if setting is disabled.
5. Return early if connection state is not `open`.
6. Return early if the matching status notification toggle is disabled.
7. Normalize customer phone number.
8. Render the message template.
9. Call `sendWhatsappText()`.
10. After successful send, update `Service.doneNotifiedAt`.

Do not throw user-facing errors from this helper by default. A failed WhatsApp send should not make the service status update fail after the database update already succeeded. Log the server error and consider an activity log or outbox later.

## Phone Number Normalization

Create a small shared server utility or local helper:

```ts
function normalizeWhatsappNumber(value: string) {
  return value.replace(/\D/g, "").replace(/^0/, "62");
}
```

Rules:

- Store customer input as-is for now.
- Send to Evolution using country code format, for example `6281234567890`.
- Do not include leading `+`.
- Return early if normalization results in an empty number.

## Message Templates

Default `done` message:

```text
Halo {customerName}, service perangkat {brand} {model} di {tokoName} sudah selesai. Silakan datang ke toko untuk pengambilan. Terima kasih.
```

Default `failed` message:

```text
Halo {customerName}, mohon maaf service perangkat {brand} {model} di {tokoName} belum berhasil diperbaiki. Silakan hubungi toko untuk info lebih lanjut.
```

Supported placeholders:

- `{customerName}`
- `{brand}`
- `{model}`
- `{tokoName}`
- `{status}`

Fallbacks:

- If `customerName` is empty, use `Pelanggan`.
- If brand/model is missing, omit or use `perangkat Anda` depending on implementation simplicity.

## Status Update Hook

Modify `actions/service-mutations.ts` in `updateStatus()`.

Current flow:

1. Validate auth/access.
2. Update service status inside transaction.
3. Create activity log.
4. Revalidate paths.
5. Return success.

New flow:

1. Keep the transaction unchanged.
2. After transaction succeeds, if `status` is `done` or `failed`, call notification helper.
3. Revalidate paths.
4. Return success.

Important:

- Do not call Evolution API inside `prisma.$transaction()`.
- Do not fail the status update only because WhatsApp send failed.
- Preserve `doneNotifiedAt` as the first duplicate guard.

Example placement:

```ts
await prisma.$transaction(async (tx) => {
  // update service and activity log
});

if (isCompletingStatus(status)) {
  await sendServiceStatusWhatsappNotification({ serviceId, status });
}

revalidateServicePaths(service.tokoId, true);
```

## Duplicate Send Guard

MVP guard:

- Use `Service.doneNotifiedAt`.
- Only send if it is `null`.
- Set it after successful Evolution send.

Known limitation:

- If two requests complete the same service at almost the same time, a race is still possible.

Stronger future guard:

- Add a `WhatsappNotification` outbox table with unique `(serviceId, status)`.
- Insert pending row transactionally during status update.
- Process sends separately with retries.

## Error Handling

MVP behavior:

- Linking errors return action errors to UI.
- Status refresh errors return action errors to UI.
- Automatic send errors are logged server-side and do not block service status changes.

Recommended logs:

- Missing Evolution env.
- Missing toko WhatsApp setting.
- Instance not connected.
- Evolution send failure.
- Invalid customer WhatsApp number.

## Webhooks

Do not implement webhooks in the first version.

Add `POST /api/evolution/webhook` later only if RMS needs:

- Incoming messages.
- Live QR updates.
- Live connection updates.
- Delivery/read receipts.

For MVP, manual refresh or polling from the settings UI is enough.

## Verification

After implementation:

1. Run Prisma migration/generate using the repo's Prisma workflow.
2. Run `bun run lint`.
3. Run `bun run build`.
4. In the app, open settings for a toko as admin.
5. Connect WhatsApp by scanning QR.
6. Confirm connection state becomes `open`.
7. Create a service with a valid `noWa`.
8. Change status to `done` and confirm customer receives message.
9. Confirm `doneNotifiedAt` is set.
10. Try changing status again and confirm duplicate message is not sent.
11. Repeat for `failed` with a new service.

## Implementation Order

1. Add Prisma model and relation.
2. Generate migration/client.
3. Add `lib/evolution.ts`.
4. Add `actions/whatsapp.ts`.
5. Add WhatsApp settings UI tab.
6. Add notification helper.
7. Hook helper into `updateStatus()`.
8. Run lint/build.
9. Test against Evolution API Lite.

## Open Decisions

- Should WhatsApp integration be gated by plan/feature registry?
- Should templates be editable in MVP or use defaults only first?
- Should failed sends be visible in activity log?
- Should we add the outbox table immediately for retry safety?
