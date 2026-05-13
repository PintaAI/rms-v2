# Supplier Returns Phase 3: Server Actions

## Goal

Phase 3 adds server-side operations for listing and updating supplier returns.

## New Action File

Create:

```txt
actions/supplier-returns.ts
```

Export from:

```txt
actions/index.ts
```

## Actions

### `getSupplierReturns(tokoId, filters)`

Filters:

- status
- query by sparepart name, supplier name, or return id
- date range
- page/pageSize

Return rows should include:

- return id
- createdAt
- status
- sparepart name
- qty
- supplierName
- reason
- refundAmount
- warranty claim summary
- createdBy/resolvedBy

### `createSupplierReturn(input)`

Used for manual returns or from claim integration.

Initial V1 can keep manual UI out of scope but action should be reusable.

Required input:

- tokoId
- sparepartId
- qty
- reason

Optional input:

- warrantyClaimId
- supplierName
- note

### `markSupplierReturnSent(id)`

Rules:

- allowed from `pending`
- sets `status = sent`
- sets `sentAt = now`

### `markSupplierReturnReplaced(id)`

Rules:

- allowed from `pending` or `sent`
- increments sparepart stock by `qty`
- writes `StockMovement` with type `supplier_return_replacement`
- sets `status = replaced`
- sets `resolvedAt = now`
- sets `resolvedById`

### `markSupplierReturnRefunded(id, refundAmount)`

Rules:

- allowed from `pending` or `sent`
- `refundAmount > 0`
- no stock change
- sets `status = refunded`
- sets `resolvedAt = now`
- sets `resolvedById`

### `markSupplierReturnRejected(id, note?)`

Rules:

- allowed from `pending` or `sent`
- no stock change
- sets `status = rejected`
- sets `resolvedAt = now`
- sets `resolvedById`

## Auth

All actions:

- `withScope(tokoId, { role: ["admin"], feature: "inventory.management" })`

## Revalidation

After mutations, revalidate:

- inventory paths
- supplier return page path
- service paths if linked to warranty claim

## Error Handling

Use clear Indonesian messages:

- `Retur supplier tidak ditemukan`
- `Retur supplier sudah selesai`
- `Nominal refund supplier wajib lebih dari nol`
- `Sparepart tidak ditemukan`
