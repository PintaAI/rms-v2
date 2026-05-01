CREATE TABLE "invoice_item" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "serviceItemId" TEXT,
  "type" "ItemType" NOT NULL,
  "referenceId" TEXT,
  "name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invoice_item_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invoice_item"
ADD CONSTRAINT "invoice_item_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "invoice_item_invoiceId_idx" ON "invoice_item"("invoiceId");
CREATE INDEX "invoice_item_serviceItemId_idx" ON "invoice_item"("serviceItemId");

INSERT INTO "invoice_item" ("id", "invoiceId", "serviceItemId", "type", "referenceId", "name", "qty", "price", "createdAt")
SELECT
  gen_random_uuid()::text,
  i."id",
  si."id",
  si."type",
  si."referenceId",
  si."name",
  si."qty",
  si."price",
  i."createdAt"
FROM "invoice" i
JOIN "service_item" si ON si."serviceId" = i."serviceId";
