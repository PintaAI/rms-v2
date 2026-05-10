# Retail Lite Phase 2: Stock Movement Ledger

## Goal

Phase 2 adds a normalized stock movement ledger so every inventory quantity change has a durable audit trail.

Current inventory changes directly update `Sparepart.stock` and use `ActivityLog` for human-readable history. That is useful, but it is not strong enough as the source of truth for retail sales and margin reporting.

This phase introduces:

```ts
StockMovement
```

The ledger records stock changes for both:

- `sparepart`
- `retail_item`

Even though the model is still named `Sparepart`, stock movement should treat it as a generic inventory item.

## Product Scope

Included in Phase 2:

- Add `StockMovement` model.
- Add movement type enum.
- Write stock movement records for existing stock-changing flows.
- Preserve existing `ActivityLog` usage.
- Preserve existing restock history UI until it is intentionally migrated.
- Capture stock before/after and price/cost snapshots.

Not included in Phase 2:

- Retail checkout.
- Retail sale models.
- Retail receipt/history.
- Full inventory report redesign.
- Reconstructing historical movements for old data.
- Using the ledger as the only stock source.

`Sparepart.stock` remains the current stock source in Phase 2. `StockMovement` is the audit ledger.

## Current Stock-Changing Flows

Existing flows that currently change stock:

- Restock sparepart in `actions/inventory.ts`.
- Add sparepart to service in `actions/service-mutations.ts`.
- Remove sparepart service item in `actions/service-mutations.ts`.
- Delete service and return used spareparts in `actions/service-mutations.ts`.
- Complete inventory audit and set physical stock in `actions/inventory-audit.ts`.

All of these should write `StockMovement` inside the same transaction as the stock update.

## Data Model Changes

Primary file:

```txt
prisma/schema.prisma
```

### Enum

Add:

```prisma
enum StockMovementType {
  restock
  service_usage
  service_return
  service_delete_return
  retail_sale
  retail_void
  audit_adjustment
}
```

Phase 2 only writes:

```txt
restock
service_usage
service_return
service_delete_return
audit_adjustment
```

The retail types are added now so Phase 3 can use them without another enum migration.

### Model

Add:

```prisma
model StockMovement {
  id                String            @id @default(uuid())
  tokoId            String
  sparepartId       String
  type              StockMovementType
  qtyChange         Int
  stockBefore       Int
  stockAfter        Int
  unitCostSnapshot  Int?
  unitPriceSnapshot Int?
  referenceType     String?
  referenceId       String?
  note              String?
  createdById       String
  createdAt         DateTime          @default(now())

  toko      Toko      @relation(fields: [tokoId], references: [id], onDelete: Cascade)
  sparepart Sparepart @relation(fields: [sparepartId], references: [id])
  createdBy User      @relation(fields: [createdById], references: [id])

  @@index([tokoId])
  @@index([sparepartId])
  @@index([createdById])
  @@index([type])
  @@index([createdAt])
  @@index([tokoId, createdAt])
  @@index([tokoId, sparepartId, createdAt])
  @@index([referenceType, referenceId])
  @@map("stock_movement")
}
```

Add reverse relations:

```prisma
model Toko {
  stockMovements StockMovement[]
}

model Sparepart {
  stockMovements StockMovement[]
}

model User {
  stockMovements StockMovement[]
}
```

## Field Semantics

### qtyChange

Positive means stock increased.

Examples:

```txt
restock               +10
service_return        +1
service_delete_return +2
audit_adjustment      +5 or -5
service_usage         -1
retail_sale           -1
retail_void           +1
```

### stockBefore And stockAfter

Always store the actual item stock around the mutation.

Example:

```txt
stockBefore = 8
qtyChange   = -2
stockAfter  = 6
```

These fields make audit and debugging easier, and they avoid recalculating historical state from all movements.

### unitCostSnapshot

Use current `purchasePrice` at movement time.

For movements that increase stock:

- Use `purchasePrice` from the item unless a future restock form supports a specific restock purchase cost.

For movements that decrease stock:

- Use `purchasePrice` snapshot to support gross margin later.

### unitPriceSnapshot

Use current `defaultPrice` at movement time.

For service and retail sale movements, this captures the likely selling price at the moment stock left inventory.

### referenceType And referenceId

Use stable string values so the ledger can point back to the source operation.

Recommended values:

```txt
referenceType = service
referenceId   = serviceId

referenceType = service_item
referenceId   = serviceItemId

referenceType = inventory_audit_session
referenceId   = sessionId

referenceType = retail_sale
referenceId   = retailSaleId
```

For Phase 2:

- Restock can use `referenceType = null`, `referenceId = null`.
- Service usage should use `service_item` after the item is created.
- Service return should use `service_item` before deleting the item.
- Service deletion return can use `service` or `service_item`. Prefer `service` if the service item is being deleted.
- Audit adjustment should use `inventory_audit_session`.

## Helper Function

Recommended file:

```txt
lib/stock-movement.ts
```

Add a small helper to avoid duplicated movement payload logic.

Suggested shape:

```ts
import type { Prisma } from "@/prisma/generated/prisma/client"
import type { StockMovementType } from "@/prisma/generated/prisma/enums"

type CreateStockMovementInput = {
  tokoId: string
  sparepartId: string
  type: StockMovementType
  qtyChange: number
  stockBefore: number
  stockAfter: number
  unitCostSnapshot?: number | null
  unitPriceSnapshot?: number | null
  referenceType?: string | null
  referenceId?: string | null
  note?: string | null
  createdById: string
}

export function createStockMovement(
  tx: Prisma.TransactionClient,
  input: CreateStockMovementInput
) {
  return tx.stockMovement.create({
    data: {
      tokoId: input.tokoId,
      sparepartId: input.sparepartId,
      type: input.type,
      qtyChange: input.qtyChange,
      stockBefore: input.stockBefore,
      stockAfter: input.stockAfter,
      unitCostSnapshot: input.unitCostSnapshot ?? null,
      unitPriceSnapshot: input.unitPriceSnapshot ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
      createdById: input.createdById,
    },
  })
}
```

Keep this helper intentionally small. It should not update stock. The caller should update stock inside its own transaction and pass the before/after values.

## Integration Details

### Restock

Primary file:

```txt
actions/inventory.ts
```

Current behavior:

- Fetch sparepart.
- Increment stock.
- Create `ActivityLog` after update.

Recommended Phase 2 behavior:

- Fetch item before transaction or inside transaction.
- Update stock inside transaction.
- Create `StockMovement` inside the same transaction.
- Keep existing `ActivityLog` behavior.

Important: `createActivityLogIfUser` currently writes outside the stock update transaction. That is acceptable for activity timeline. `StockMovement` should be inside the transaction.

Pseudo-flow:

```ts
const updated = await prisma.$transaction(async (tx) => {
  const current = await tx.sparepart.findUniqueOrThrow({
    where: { id: validated.id },
    select: {
      id: true,
      tokoId: true,
      stock: true,
      purchasePrice: true,
      defaultPrice: true,
    },
  })

  const updated = await tx.sparepart.update({
    where: { id: validated.id },
    data: { stock: { increment: validated.qty } },
    include: existingInclude,
  })

  await createStockMovement(tx, {
    tokoId: current.tokoId,
    sparepartId: current.id,
    type: "restock",
    qtyChange: validated.qty,
    stockBefore: current.stock,
    stockAfter: updated.stock,
    unitCostSnapshot: current.purchasePrice,
    unitPriceSnapshot: current.defaultPrice,
    createdById: access.user.id,
  })

  return updated
})
```

### Add Sparepart To Service

Primary file:

```txt
actions/service-mutations.ts
```

Current behavior:

- Validate item.
- Decrement stock with `updateMany` guard.
- Create `ServiceItem`.
- Create `ActivityLog`.

Recommended Phase 2 behavior:

- Keep stock decrement guard.
- Create `ServiceItem`.
- Create `StockMovement` inside same transaction.

Because stock is decremented with `updateMany`, use known before/after values:

```ts
stockBefore = sparepart.stock
stockAfter = sparepart.stock - qty
qtyChange = -qty
```

This is safe if the `updateMany` guard succeeds with `stock: { gte: qty }`. If stronger exact before-stock matching is desired, update where can include `stock: sparepart.stock`, but that can increase retry failures under concurrency.

Recommended movement:

```ts
await createStockMovement(tx, {
  tokoId: scope.tokoId,
  sparepartId: validated.data.sparepartId,
  type: "service_usage",
  qtyChange: -validated.data.qty,
  stockBefore: sparepart.stock,
  stockAfter: sparepart.stock - validated.data.qty,
  unitCostSnapshot: sparepart.purchasePrice,
  unitPriceSnapshot: sparepart.defaultPrice,
  referenceType: "service_item",
  referenceId: createdItem.id,
  createdById: scope.user.id,
})
```

Ensure the initial sparepart select includes:

```ts
purchasePrice: true
kind: true
```

If Phase 1 has been implemented, keep the guard:

```ts
if (sparepart.kind !== "sparepart") throw new Error(...)
```

### Remove Service Item

Primary file:

```txt
actions/service-mutations.ts
```

Current behavior:

- Delete `ServiceItem`.
- Increment stock.
- Create `ActivityLog`.

Recommended Phase 2 behavior:

- Fetch current sparepart stock before increment.
- Delete service item.
- Increment stock.
- Create `StockMovement` inside same transaction.

The current item query should include sparepart snapshots:

```ts
sparepart: {
  select: {
    stock: true,
    purchasePrice: true,
    defaultPrice: true,
  }
}
```

Movement:

```ts
type: "service_return"
qtyChange: item.qty
stockBefore: item.sparepart.stock
stockAfter: item.sparepart.stock + item.qty
referenceType: "service_item"
referenceId: item.id
```

### Delete Service

Primary file:

```txt
actions/service-mutations.ts
```

Current behavior:

- Fetch service items.
- For each sparepart item, increment stock.
- Delete service items, invoice, service.

Recommended Phase 2 behavior:

- Fetch service items with sparepart stock, purchase price, and default price.
- For each sparepart item, increment stock.
- Create movement `service_delete_return`.
- Keep existing activity log behavior.

Movement:

```ts
type: "service_delete_return"
qtyChange: item.qty
referenceType: "service"
referenceId: serviceId
```

Note: if multiple service items reference the same sparepart, process sequentially and use fresh stock values per item or aggregate by sparepart first.

Recommended simpler approach:

- Aggregate returned quantities by `referenceId`.
- Fetch each sparepart once.
- Increment once per sparepart.
- Create one movement per sparepart.

This avoids confusing before/after values when the same item appears multiple times.

### Complete Inventory Audit

Primary file:

```txt
actions/inventory-audit.ts
```

Current behavior:

- Updates stock to physical count using a raw SQL `UPDATE ... FROM VALUES`.
- Creates activity logs for adjusted items.
- Completes audit session.

Recommended Phase 2 behavior:

- Keep the existing safe raw update pattern.
- After `updatedStocks` succeeds, create stock movements for adjusted items.
- Movement type: `audit_adjustment`.

Movement data:

```ts
type: "audit_adjustment"
qtyChange: item.difference
stockBefore: item.systemStock
stockAfter: item.physicalStock
unitCostSnapshot: item.snapshotPurchasePrice
unitPriceSnapshot: item.snapshotPrice
referenceType: "inventory_audit_session"
referenceId: session.id
note: item.mismatchReason
```

Only create movements where:

```ts
item.difference !== 0
```

## ActivityLog Relationship

Do not remove existing `ActivityLog` entries in Phase 2.

Use both systems:

```txt
ActivityLog    = human-readable operational timeline
StockMovement  = normalized stock accounting ledger
```

This keeps current UI stable while creating a reliable foundation for retail.

Later, restock history and inventory reports can read from `StockMovement`, but not in Phase 2 unless necessary.

## Query Helpers

Phase 2 may add read actions if there is time, but they are not required for the core ledger.

Potential action:

```ts
getStockMovements(tokoId, filters)
```

Filters:

- item id
- movement type
- user id
- date range
- page/pageSize

Recommended deferral: wait until a UI needs it.

## Revalidation

Stock movement writes do not require new revalidation paths by themselves.

Keep existing revalidation calls:

- `revalidateInventoryPaths()` for inventory changes.
- `revalidateServicePaths()` for service changes.

If a stock movement history page is added later, include:

```ts
revalidatePath(`/${tokoId}/admin/inventory/stock-movements`)
```

## Data Backfill

Do not backfill historical stock movements in Phase 2.

Reason:

- Existing stock history in `ActivityLog` is not complete enough to reconstruct every stock state reliably.
- Backfilled stock before/after values could be misleading.

Recommended approach:

- Start recording movements from the migration date forward.
- Existing stock remains valid from `Sparepart.stock`.
- Future reports that rely on movements should clearly be forward-looking.

Optional later migration:

- Create one opening balance movement per item.
- Type would require a new enum value like `opening_balance`.

Not recommended for Phase 2 unless needed.

## Acceptance Criteria

Phase 2 is complete when:

- `StockMovementType` enum exists.
- `StockMovement` model exists.
- Prisma relations are wired for `Toko`, `Sparepart`, and `User`.
- Restock writes a `restock` movement in the same transaction as stock increment.
- Adding sparepart to service writes `service_usage` movement in the same transaction as stock decrement.
- Removing sparepart from service writes `service_return` movement in the same transaction as stock increment.
- Deleting a service returns stock and writes `service_delete_return` movement.
- Completing inventory audit writes `audit_adjustment` movements for adjusted items.
- Existing `ActivityLog` behavior still works.
- Existing inventory/service UI behavior does not regress.
- `Sparepart.stock` remains the source for current stock.

## Manual QA Checklist

### Restock

- Restock an item by 5.
- Verify item stock increases by 5.
- Verify one `StockMovement` row exists:
  - `type = restock`
  - `qtyChange = 5`
  - `stockAfter = stockBefore + 5`

### Service Usage

- Add a sparepart qty 1 to a service.
- Verify item stock decreases by 1.
- Verify one `StockMovement` row exists:
  - `type = service_usage`
  - `qtyChange = -1`
  - `referenceType = service_item`

### Service Return

- Remove that sparepart item from the service.
- Verify stock increases by 1.
- Verify one `StockMovement` row exists:
  - `type = service_return`
  - `qtyChange = 1`

### Service Delete Return

- Create service with sparepart item.
- Delete service before payment.
- Verify stock is returned.
- Verify `service_delete_return` movement exists.

### Inventory Audit

- Start audit.
- Change physical count for one item.
- Complete audit.
- Verify item stock equals physical count.
- Verify `audit_adjustment` movement exists with correct `qtyChange`.

### Existing UI

- Restock history still renders.
- Inventory report still renders.
- Service invoice flow still renders.
- Payment flow still works.

## Risks

### Risk: Movement and stock update diverge

Mitigation:

- Always create movement inside the same transaction as the stock mutation.

### Risk: Wrong before/after values under concurrency

Mitigation:

- Prefer fetching current stock inside transaction where practical.
- For guarded `updateMany`, only write movement after update succeeds.
- Consider stricter exact-stock updates later if concurrency bugs appear.

### Risk: ActivityLog and StockMovement duplicate concepts

Mitigation:

- Treat `ActivityLog` as human timeline.
- Treat `StockMovement` as inventory ledger.
- Do not remove existing logs in Phase 2.

### Risk: Backfill creates misleading data

Mitigation:

- Do not backfill historical movements in Phase 2.

## Implementation Order

Recommended sequence:

1. Add `StockMovementType` enum to Prisma schema.
2. Add `StockMovement` model and relations.
3. Create migration.
4. Regenerate Prisma client through the normal project workflow if needed.
5. Add `lib/stock-movement.ts` helper.
6. Update restock flow.
7. Update add-service-sparepart flow.
8. Update remove-service-item flow.
9. Update delete-service flow.
10. Update inventory-audit completion flow.
11. Manually QA each stock-changing flow.

## Notes For Phase 3

Retail checkout should use the same ledger.

When a retail sale succeeds:

```txt
type = retail_sale
qtyChange = -qty
referenceType = retail_sale
referenceId = retailSaleId
```

If void/cancel is implemented:

```txt
type = retail_void
qtyChange = +qty
referenceType = retail_sale
referenceId = retailSaleId
```

Retail sale items should snapshot both selling price and purchase cost. Stock movement should also snapshot cost and price for inventory auditability.
