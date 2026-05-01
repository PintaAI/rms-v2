ALTER TABLE "sparepart" ADD COLUMN "barcode" TEXT;

WITH numbered_spareparts AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "tokoId" ORDER BY "name", "id") AS sequence_number
  FROM "sparepart"
)
UPDATE "sparepart" AS s
SET "barcode" = 'SP' || LPAD(numbered_spareparts.sequence_number::text, 6, '0')
FROM numbered_spareparts
WHERE s."id" = numbered_spareparts."id";

ALTER TABLE "sparepart" ALTER COLUMN "barcode" SET NOT NULL;

CREATE UNIQUE INDEX "sparepart_tokoId_barcode_key" ON "sparepart"("tokoId", "barcode");
