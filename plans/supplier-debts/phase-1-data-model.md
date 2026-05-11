# Supplier Debts Phase 1: Data Model

## Goal

Phase 1 adds the database foundation for manual supplier debts.

The data model should be small, stable, and ready for future restock integration without requiring that integration now.

## Prisma Changes

Primary file:

```txt
prisma/schema.prisma
```

## Enum

Add:

```prisma
enum SupplierDebtStatus {
  unpaid
  partial
  paid
}
```

Do not add `overdue` as a stored enum in V1.

Overdue can be computed in the UI when:

```txt
status != paid and dueDate < today
```

This avoids status drift.

## Toko Relation

Add relations to `Toko`:

```prisma
suppliers     Supplier[]
supplierDebts SupplierDebt[]
```

## Supplier Model

Add:

```prisma
model Supplier {
  id        String   @id @default(uuid())
  tokoId    String
  name      String
  phone     String?
  address   String?
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  toko  Toko           @relation(fields: [tokoId], references: [id], onDelete: Cascade)
  debts SupplierDebt[]

  @@unique([tokoId, name])
  @@index([tokoId])
  @@map("supplier")
}
```

## SupplierDebt Model

Add:

```prisma
model SupplierDebt {
  id            String             @id @default(uuid())
  tokoId        String
  supplierId    String
  invoiceNumber String?
  description   String?
  totalAmount   Int
  paidAmount    Int                @default(0)
  dueDate       DateTime?
  status        SupplierDebtStatus @default(unpaid)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  toko     Toko                  @relation(fields: [tokoId], references: [id], onDelete: Cascade)
  supplier Supplier              @relation(fields: [supplierId], references: [id])
  payments SupplierDebtPayment[]

  @@index([tokoId])
  @@index([supplierId])
  @@index([status])
  @@index([dueDate])
  @@map("supplier_debt")
}
```

## SupplierDebtPayment Model

Add:

```prisma
model SupplierDebtPayment {
  id          String   @id @default(uuid())
  debtId      String
  amount      Int
  paymentDate DateTime @default(now())
  note        String?
  createdAt   DateTime @default(now())

  debt SupplierDebt @relation(fields: [debtId], references: [id], onDelete: Cascade)

  @@index([debtId])
  @@index([paymentDate])
  @@map("supplier_debt_payment")
}
```

## Validation Rules

Server actions must enforce:

- `totalAmount > 0`
- `paidAmount >= 0`
- `paidAmount <= totalAmount`
- payment `amount > 0`
- payment cannot exceed remaining debt
- supplier belongs to the same toko as the debt

## Status Helper

Create a small helper inside `actions/supplier-debts.ts`:

```ts
function getSupplierDebtStatus(totalAmount: number, paidAmount: number) {
  if (paidAmount >= totalAmount) return "paid";
  if (paidAmount > 0) return "partial";
  return "unpaid";
}
```

Keep it local until another file needs it.

## Migration Notes

After editing schema, run the Prisma migration/generate workflow only when approved for implementation.

Expected migration shape:

- create `SupplierDebtStatus` enum
- create `supplier` table
- create `supplier_debt` table
- create `supplier_debt_payment` table
- add foreign keys and indexes
