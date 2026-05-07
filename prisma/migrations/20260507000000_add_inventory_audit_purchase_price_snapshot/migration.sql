ALTER TABLE "inventory_audit_item" ADD COLUMN "snapshotPurchasePrice" INTEGER NOT NULL DEFAULT 0;

UPDATE "inventory_audit_item" AS iai
SET "snapshotPurchasePrice" = COALESCE(s."purchasePrice", 0)
FROM "sparepart" AS s
WHERE iai."sparepartId" = s."id";

UPDATE "inventory_audit_item"
SET "potentialLostValue" = "missingQty" * "snapshotPurchasePrice";
