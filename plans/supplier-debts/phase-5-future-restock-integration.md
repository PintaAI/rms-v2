# Supplier Debts Phase 5: Future Restock Integration

## Goal

Phase 5 is a backlog phase for connecting supplier debts to restock later.

Do not implement this in the simple MVP unless explicitly requested.

## Reason To Defer

Current restock is item-based and records stock-in activity logs.

Supplier debt is nota-based and may include multiple spareparts from one supplier.

Connecting them now would require more changes to inventory actions and restock UI.

For V1, manual debt entry is safer.

## Future Product Flow

When admin restocks spareparts, add optional section:

```txt
Buat hutang supplier dari restock ini
```

Fields:

```txt
Supplier
No nota supplier
Tanggal nota
Jatuh tempo
Total pembelian
Dibayar sekarang
```

If enabled:

- stock is incremented as usual
- supplier debt is created in the same transaction
- initial payment is created if paid amount > 0

## Data Model Upgrade Option

If purchase item detail becomes required, add:

```txt
SupplierPurchase
SupplierPurchaseItem
```

At that point, decide whether `SupplierDebt` remains separate or `SupplierPurchase` becomes the payable record.

Recommended future direction:

```txt
SupplierPurchase = nota pembelian supplier
SupplierPurchaseItem = item sparepart dalam nota
SupplierPayment = pembayaran nota
```

Then `SupplierDebt` may not be needed as a separate model.

## Minimal Bridge Alternative

If avoiding new purchase models, add nullable relation from debt to restock batch.

This requires a restock batch model first because current restock history is activity-log based.

Possible future model:

```txt
RestockBatch
RestockBatchItem
SupplierDebt.restockBatchId?
```

Do not add this until there is a clear need for item-level purchase traceability.

## Future Reports

Possible reports after integration:

- supplier outstanding summary
- supplier purchase history
- sparepart capital by supplier
- overdue supplier notes
- monthly supplier payments

These are out of scope for the simple MVP.
