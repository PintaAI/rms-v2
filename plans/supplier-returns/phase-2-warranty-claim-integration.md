# Supplier Returns Phase 2: Warranty Claim Integration

## Goal

Phase 2 lets staff/admin create a supplier return while resolving a customer warranty claim with `Ganti sparepart`.

## Entry Point

File:

```txt
components/dashboard/services/service-detail-card/service-detail-card.tsx
```

Dialog:

```txt
Tutup Klaim Garansi
```

Only show supplier return fields when:

```txt
claimResolution === "replace_part"
```

## UI Fields

Add checkbox:

```txt
Part lama akan diretur ke supplier
```

When checked, show:

- sparepart lama/bermasalah
- qty retur
- supplier name
- alasan retur
- catatan optional

## Defaults

Default sparepart lama should be the selected replacement sparepart.

Reason: most warranty replacement cases return the same part category back to supplier.

Allow admin/staff to choose another sparepart if needed.

Default supplier name should use:

```txt
selected sparepart.supplierName
```

If empty, allow manual input.

## Server Contract

Extend `resolveWarrantyClaim` input with optional supplier return payload:

```ts
supplierReturn?: {
  sparepartId: string
  qty: number
  supplierName?: string
  reason: string
  note?: string
}
```

## Transaction Rule

Warranty claim resolution and supplier return creation must happen in the same transaction.

If creating supplier return fails, the claim should not be closed and replacement stock should not be decremented.

## Inventory Rule

Creating supplier return does not change stock.

Stock already changed because the replacement sparepart was used for the customer claim.

## Activity Log

When supplier return is created from claim, create activity:

```txt
supplier_return_created
```

Payload should include:

- supplierReturnId
- warrantyClaimId
- sparepartId
- qty
- supplierName
- reason

## Acceptance Criteria

- Resolving claim with `Ganti sparepart` still decrements replacement stock.
- If checkbox is unchecked, no supplier return is created.
- If checkbox is checked, supplier return is created with status `pending`.
- Supplier return links back to the warranty claim.
- Part lama is not added to inventory stock.
