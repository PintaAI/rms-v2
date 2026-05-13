# Supplier Returns Phase 5: Reports And Backlog

## Goal

Phase 5 captures reporting and advanced ideas that should not block the V1 operational workflow.

## Reports

Potential reports:

- pending return value by supplier
- average supplier return resolution time
- replaced qty by supplier
- refunded amount by supplier
- rejected return count by supplier
- spareparts most often returned

## Dashboard Cards

Future inventory dashboard cards:

- Retur pending
- Retur dikirim
- Retur diganti bulan ini
- Refund supplier bulan ini

## Supplier Quality Signals

Possible future scorecard:

- supplier return rate
- supplier rejection rate
- average days to replacement/refund
- total returned cost value

Keep this informational only unless product later wants supplier ranking.

## Supplier Debt Integration

Possible future behavior:

- supplier refund can offset supplier debt
- supplier replacement can be linked to purchase/restock history
- rejected return can add note to supplier record

Do not add this in V1.

## Proof Uploads

Possible future fields:

- damage photo URL
- shipping receipt URL
- supplier response proof URL

This can reuse the existing blob upload pattern later.

## Manual Returns

V1 focuses on warranty-claim-linked returns.

Future manual return creation can support:

- broken stock found during audit
- dead-on-arrival sparepart from supplier
- wrong part delivered by supplier

Manual returns must still not add stock until supplier replacement is confirmed.

## Export

Possible export formats:

- CSV
- XLSX
- supplier-specific statement

## Backlog Rules

Do not implement these until the core lifecycle is stable:

- multi-item return batches
- shipping cost tracking
- accounting journal
- supplier performance score
- automatic debt offset
