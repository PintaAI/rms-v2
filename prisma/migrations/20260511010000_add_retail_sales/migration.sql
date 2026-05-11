CREATE TYPE "RetailSaleStatus" AS ENUM ('paid', 'void');

CREATE TYPE "RetailPaymentMethod" AS ENUM ('cash', 'transfer', 'qris', 'debit');

CREATE TABLE "retail_sale" (
  "id" TEXT NOT NULL,
  "tokoId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "subtotal" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "grandTotal" INTEGER NOT NULL,
  "paymentMethod" "RetailPaymentMethod" NOT NULL,
  "cashReceived" INTEGER,
  "changeAmount" INTEGER,
  "status" "RetailSaleStatus" NOT NULL DEFAULT 'paid',
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "retail_sale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "retail_sale_item" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "sparepartId" TEXT,
  "name" TEXT NOT NULL,
  "barcode" TEXT,
  "kind" "InventoryItemKind" NOT NULL,
  "qty" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "unitCostSnapshot" INTEGER,
  "lineTotal" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "retail_sale_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retail_sale_tokoId_idx" ON "retail_sale"("tokoId");
CREATE INDEX "retail_sale_createdById_idx" ON "retail_sale"("createdById");
CREATE INDEX "retail_sale_status_idx" ON "retail_sale"("status");
CREATE INDEX "retail_sale_paymentMethod_idx" ON "retail_sale"("paymentMethod");
CREATE INDEX "retail_sale_paidAt_idx" ON "retail_sale"("paidAt");
CREATE INDEX "retail_sale_tokoId_paidAt_idx" ON "retail_sale"("tokoId", "paidAt");

CREATE INDEX "retail_sale_item_saleId_idx" ON "retail_sale_item"("saleId");
CREATE INDEX "retail_sale_item_sparepartId_idx" ON "retail_sale_item"("sparepartId");
CREATE INDEX "retail_sale_item_kind_idx" ON "retail_sale_item"("kind");

ALTER TABLE "retail_sale"
ADD CONSTRAINT "retail_sale_tokoId_fkey"
FOREIGN KEY ("tokoId") REFERENCES "toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "retail_sale"
ADD CONSTRAINT "retail_sale_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "retail_sale_item"
ADD CONSTRAINT "retail_sale_item_saleId_fkey"
FOREIGN KEY ("saleId") REFERENCES "retail_sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "retail_sale_item"
ADD CONSTRAINT "retail_sale_item_sparepartId_fkey"
FOREIGN KEY ("sparepartId") REFERENCES "sparepart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
