# 00 Decisions

Lock these decisions before editing `prisma/schema.prisma` or writing SQL migrations.

Every row below must end with one of these states before implementation starts: `accepted`, `rejected`, or `deferred`. If a decision is `deferred`, the migration must explicitly avoid touching that concern.

## Recommended Decisions For First Migration

| Decision | Recommendation | Reason |
|---|---|---|
| Route URLs | Keep stable | Avoid product behavior changes while schema changes are already large. |
| Route param `[tokoid]` | Keep stable | Renaming route params touches the entire app shell and proxy behavior. |
| Permission keys | Keep stable | Prevent access-control regressions and avoid migrating stored permission override keys. |
| Feature keys | Keep stable | Prevent feature gate regressions. |
| Physical DB names | Rename now | The purpose is domain clarity; `@@map` forever keeps the old domain hidden in the DB. |
| `InventoryItem.deviceModelId` | Add now | Required for phone unit inventory and cleaner catalog links. |
| `InventoryUnit` | Defer | Serialized/IMEI tracking needs product rules before schema commitment. |
| `phone_unit` enum value | Add now | Safe additive value; existing rows should not auto-convert. |
| `mobileApiId` | Keep for now | Current field is provider-specific; generic `externalId` should wait for a second provider or identity model. |
| `noWa` | Keep for now | WhatsApp behavior depends on it and user-facing wording is Indonesian. |
| `ActivityType` values | Keep for now | Historical audit events should not be rewritten during the structural rename. |
| User-facing labels | Keep Indonesian/product labels unless misleading | Internal schema clarity does not require changing UI language. |

## Decision Record Template

Use this checklist in the implementation PR or migration notes.

| Decision | State | Notes |
|---|---|---|
| Route URLs stay stable | accepted | `/service`, `/retail`, `/supplier-debts`, and `[tokoid]` unchanged. |
| Permission keys stay stable | accepted | Stored `permissionKey` values are not migrated. |
| Feature keys stay stable | accepted | Stored feature settings are not migrated. |
| Physical table and column names are renamed | accepted | Manual SQL migration required. |
| `InventoryUnit` is deferred | accepted | No serialized stock model in first migration. |
| `mobileApiId` stays | accepted | No `externalId` field in first migration. |
| `noWa` stays | accepted | WhatsApp behavior unchanged. |
| WhatsApp behavior stays | accepted | Only store-scoped table/model/FK names are affected. |
| `ActivityType` values stay | accepted | Historical audit values unchanged. |

## Must Not Change In First Migration

- Public route paths.
- Route param folder names.
- Permission key strings such as `service.view` or `supplier_debts.view`.
- Feature key strings.
- User-facing Indonesian labels unless a compile-time type rename requires local variable cleanup.
- WhatsApp connection, inbox, templates, instance naming, and notification behavior.
- Historical `ActivityLog.type` enum values.
- Existing `referenceType` string values unless a specific runtime path needs the new name.

## Open Decisions For Later Migrations

- Should `[tokoid]` eventually become `[storeId]`?
- Should `/service` eventually become `/repair-orders`?
- Should `/supplier-debts` eventually become `/supplier-payables`?
- Should audit log event names such as `service_created` become `repair_order_created`?
- Should inventory use quantity stock only, serialized `InventoryUnit`, or both?
- Should device external identities become a separate table instead of renaming `mobileApiId`?

## Guardrail

Do not mix these deferred product-level changes into the schema-domain migration. If a rename is not needed to compile against the new Prisma schema, defer it.
