# Supplier Debts Phase 2: Server Actions

## Goal

Phase 2 adds server actions for supplier, debt, and payment operations without touching existing inventory actions.

Primary file:

```txt
actions/supplier-debts.ts
```

## Access Pattern

All actions should:

- require toko scope
- require admin role
- require `inventory.management`

Recommended pattern:

```ts
return withScope(tokoId, { role: ["admin"], feature: "inventory.management" }, async (scope) => {
  // action body
});
```

If a helper action receives only `debtId`, first fetch the debt's `tokoId`, then enforce scope on that toko.

## Types

Export simple DTO types for UI use:

```ts
export type SupplierOption = {
  id: string;
  name: string;
  phone: string | null;
};

export type SupplierDebtListItem = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string | null;
  description: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date | null;
  status: "unpaid" | "partial" | "paid";
  paymentCount: number;
  createdAt: Date;
};
```

## Actions

Implement these first:

```ts
getSuppliers(tokoId)
createSupplier(data)
getSupplierDebts(tokoId)
createSupplierDebt(data)
updateSupplierDebt(data)
deleteSupplierDebt(id)
addSupplierDebtPayment(data)
```

Do not add payment deletion in V1.

## getSuppliers

Input:

```txt
tokoId
```

Return suppliers ordered by name.

Used by create/edit debt form.

## createSupplier

Input:

```txt
tokoId
name
phone?
address?
note?
```

Rules:

- trim text fields
- require non-empty name
- unique per toko by name

Return created supplier option.

## getSupplierDebts

Input:

```txt
tokoId
optional filters later
```

For V1, return all debts ordered by latest created date.

Include:

- supplier name
- payment count
- computed remaining amount

Also return summary:

```ts
{
  items,
  totalDebtAmount,
  totalPaidAmount,
  totalRemainingAmount,
  activeDebtCount,
}
```

Only active outstanding debts should contribute to `totalRemainingAmount` and `activeDebtCount`.

## createSupplierDebt

Input:

```txt
tokoId
supplierId
invoiceNumber?
description?
totalAmount
paidAmount?
dueDate?
```

Rules:

- supplier must belong to toko
- compute status from total and paid amount
- if initial `paidAmount > 0`, create an initial `SupplierDebtPayment` row in the same transaction

Initial payment note can be:

```txt
Pembayaran awal
```

## updateSupplierDebt

Input:

```txt
id
supplierId
invoiceNumber?
description?
totalAmount
dueDate?
```

Rules:

- do not directly edit `paidAmount`
- if `totalAmount` is lower than existing `paidAmount`, reject
- recompute status after total update
- supplier must belong to same toko

## deleteSupplierDebt

Input:

```txt
id
```

Rules:

- only admin
- reject if `payments.length > 0`
- allow delete if no payment history

## addSupplierDebtPayment

Input:

```txt
debtId
amount
paymentDate?
note?
```

Rules:

- reject if debt is already paid
- reject if amount exceeds remaining debt
- transaction: create payment, update `paidAmount`, recompute status

## Revalidation

Create a local helper:

```ts
function revalidateSupplierDebtPaths(tokoId: string) {
  revalidatePath(`/${tokoId}/admin/supplier-debts`);
}
```

Do not revalidate inventory pages in V1 because the feature is manual and does not alter stock.
