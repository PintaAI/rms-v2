# Plan: Audit Gudang

## Goal

Audit Gudang adalah fitur untuk mengecek kesesuaian stok sparepart sistem dengan stok fisik toko. Fitur ini membantu admin menemukan mismatch, mencari penyebabnya, menghitung nilai selisih, lalu menyesuaikan stok dengan riwayat dan activity log yang jelas.

## Scope MVP

- Hanya admin yang bisa membuat, mengisi, complete, dan cancel audit.
- Satu toko hanya boleh punya satu audit aktif.
- Audit mencakup semua sparepart toko.
- Tidak ada mode harian, mingguan, atau bulanan.
- Tidak ada barcode scanner.
- Tidak audit jasa/service pricelist.
- Tidak multi-user live counting.
- Complete audit otomatis update `Sparepart.stock` ke stok fisik.

## Main Flow

1. Admin buka `Inventory > Audit Gudang`.
2. Admin klik `Mulai Audit`.
3. Sistem snapshot semua sparepart toko: `sparepartId`, nama sparepart, stok sistem saat audit, dan harga sparepart saat audit dari `Sparepart.defaultPrice`.
4. Admin input stok fisik.
5. Sistem hitung `difference`, `missingQty`, `excessQty`, `differenceValue`, dan `potentialLostValue`.
6. Jika mismatch, admin wajib isi alasan.
7. Admin complete audit.
8. Sistem update stok sparepart dalam transaction.
9. Sistem simpan audit history dan activity log.

## Mismatch Reasons

- `used_in_service_not_recorded`
- `lost`
- `damaged`
- `incoming_stock_not_recorded`
- `previous_stock_error`
- `physical_count_error`
- `other`

Rule:

- Item match tidak perlu alasan.
- Item mismatch wajib punya alasan sebelum complete.
- `note` optional, tapi disarankan untuk `other`.

## Prisma Changes

File: `prisma/schema.prisma`

Add enums:

```prisma
enum InventoryAuditStatus {
  active
  completed
  cancelled
}

enum InventoryAuditItemStatus {
  pending
  matched
  discrepancy
}

enum InventoryAuditMismatchReason {
  used_in_service_not_recorded
  lost
  damaged
  incoming_stock_not_recorded
  previous_stock_error
  physical_count_error
  other
}
```

Extend `ActivityType`:

```prisma
inventory_audit_started
inventory_audit_completed
inventory_audit_cancelled
inventory_audit_stock_adjusted
```

Add models:

- `InventoryAuditSession`
- `InventoryAuditItem`

Relations:

- `Toko` has many `InventoryAuditSession`.
- `User` has many created audit sessions.
- `Sparepart` has many audit items.
- `InventoryAuditSession` has many audit items.

## Server Actions

Add `actions/inventory-audit.ts`.

Actions:

- `getInventoryAuditOverview(tokoId)`
- `startInventoryAudit(tokoId)`
- `updateInventoryAuditItem(input)`
- `completeInventoryAudit(sessionId)`
- `cancelInventoryAudit(sessionId)`

Rules:

- Write actions admin-only.
- User must have toko access.
- `startInventoryAudit` fails if toko has active audit.
- `startInventoryAudit` snapshots all spareparts.
- `updateInventoryAuditItem` only works for active session.
- `completeInventoryAudit` fails if any item is uncounted.
- `completeInventoryAudit` fails if any mismatch has no reason.
- `completeInventoryAudit` updates stock and creates activity logs in one transaction.
- Use guarded stock update so service mutations during an active audit cannot be overwritten silently.

## Activity Log

Use existing `ActivityLog`; do not create a second log system.

Add config labels in `components/dashboard/admin/activity-log.tsx` for:

- `inventory_audit_started`
- `inventory_audit_completed`
- `inventory_audit_cancelled`
- `inventory_audit_stock_adjusted`

## UI

Restore route:

- `app/(dashboard)/[tokoid]/admin/inventory/audit-gudang/page.tsx`

Add components under:

- `components/dashboard/inventory/audit-gudang/`

Suggested components:

- `audit-dashboard.tsx`
- `start-audit-card.tsx`
- `audit-summary-cards.tsx`
- `audit-item-table.tsx`
- `complete-audit-dialog.tsx`
- `audit-history-list.tsx`

Page states:

- No active audit: show start audit card and recent history.
- Active audit: show count table, filters, summary cards, complete/cancel actions.
- Completed audit: show read-only summary and item details.

## Navigation

Update `components/dashboard/nav/admin-nav.tsx` and restore `Inventory > Audit Gudang` with href `/${tokoid}/admin/inventory/audit-gudang`.

## Revalidation

Update `lib/revalidation.ts` to use toko-aware inventory paths:

- `/${tokoId}/admin/inventory`
- `/${tokoId}/admin/inventory/audit-gudang`
- `/${tokoId}/staff/inventory`
- `/${tokoId}/teknisi/inventory`
- `/${tokoId}/admin`

## Documentation

Update after feature works:

- `user-manual/01-overview[RiBook2Line].md`
- `user-manual/03-role-dan-akses[RiUserSettingsLine].md`
- `user-manual/05-inventory[RiArchiveLine].md`

Document purpose, admin-only access, automatic stock adjustment, `Potensi Hilang` as an estimate for investigation, and mismatch reasons.

## Verification

Run:

```bash
bun run lint
bun run build
```

Manual test:

- Admin can start audit.
- Cannot start second active audit for same toko.
- Staff/teknisi cannot write audit.
- Equal, lower, and higher physical stock cases work.
- Complete fails if any item is uncounted.
- Complete fails if mismatch has no reason.
- Complete updates `Sparepart.stock`.
- Complete writes activity logs.
- Stock changes during active audit are handled safely.
