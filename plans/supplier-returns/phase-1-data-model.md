# Supplier Returns Phase 1: Data Model

## Goal

Phase 1 adds the database foundation for supplier returns without changing existing warranty claim behavior yet.

## Prisma Changes

Primary file:

```txt
prisma/schema.prisma
```

## Enum

Add:

```prisma
enum SupplierReturnStatus {
  pending
  sent
  replaced
  refunded
  rejected
}
```

## Model

Add:

```prisma
model SupplierReturn {
  id              String               @id @default(uuid())
  tokoId          String
  warrantyClaimId String?
  sparepartId     String

  qty          Int
  supplierName String?
  reason       String
  status       SupplierReturnStatus @default(pending)

  refundAmount Int     @default(0)
  note         String?

  createdById  String
  resolvedById String?
  createdAt    DateTime @default(now())
  sentAt        DateTime?
  resolvedAt   DateTime?

  toko          Toko           @relation(fields: [tokoId], references: [id], onDelete: Cascade)
  warrantyClaim WarrantyClaim? @relation(fields: [warrantyClaimId], references: [id], onDelete: SetNull)
  sparepart     Sparepart      @relation(fields: [sparepartId], references: [id])
  createdBy     User           @relation("SupplierReturnCreatedBy", fields: [createdById], references: [id])
  resolvedBy    User?          @relation("SupplierReturnResolvedBy", fields: [resolvedById], references: [id])

  @@index([tokoId])
  @@index([warrantyClaimId])
  @@index([sparepartId])
  @@index([status])
  @@index([createdAt])
  @@map("supplier_return")
}
```

## Relations

Add to `Toko`:

```prisma
supplierReturns SupplierReturn[]
```

Add to `WarrantyClaim`:

```prisma
supplierReturns SupplierReturn[]
```

Add to `Sparepart`:

```prisma
supplierReturns SupplierReturn[]
```

Add to `User`:

```prisma
createdSupplierReturns  SupplierReturn[] @relation("SupplierReturnCreatedBy")
resolvedSupplierReturns SupplierReturn[] @relation("SupplierReturnResolvedBy")
```

## Stock Movement

Add a stock movement type for supplier replacement:

```prisma
enum StockMovementType {
  ...
  supplier_return_replacement
}
```

Use this only when status becomes `replaced` and stock increments.

## Activity Types

Add activity types:

```prisma
supplier_return_created
supplier_return_sent
supplier_return_replaced
supplier_return_refunded
supplier_return_rejected
```

## Validation Rules

Server actions must enforce:

- `qty > 0`
- `refundAmount >= 0`
- supplier return belongs to requested toko
- sparepart belongs to same toko
- warranty claim, when provided, belongs to same toko
- resolved returns cannot be resolved again

## Migration Notes

Expected migration shape:

- create `SupplierReturnStatus` enum
- add `supplier_return_replacement` to `StockMovementType`
- add supplier return activity values
- create `supplier_return` table
- add indexes and foreign keys
