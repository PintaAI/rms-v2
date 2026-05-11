CREATE TYPE "SupplierDebtStatus" AS ENUM ('unpaid', 'partial', 'paid');

CREATE TABLE "supplier" (
  "id" TEXT NOT NULL,
  "tokoId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_debt" (
  "id" TEXT NOT NULL,
  "tokoId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "invoiceNumber" TEXT,
  "description" TEXT,
  "totalAmount" INTEGER NOT NULL,
  "paidAmount" INTEGER NOT NULL DEFAULT 0,
  "dueDate" TIMESTAMP(3),
  "status" "SupplierDebtStatus" NOT NULL DEFAULT 'unpaid',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "supplier_debt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_debt_payment" (
  "id" TEXT NOT NULL,
  "debtId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplier_debt_payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_tokoId_name_key" ON "supplier"("tokoId", "name");
CREATE INDEX "supplier_tokoId_idx" ON "supplier"("tokoId");

CREATE INDEX "supplier_debt_tokoId_idx" ON "supplier_debt"("tokoId");
CREATE INDEX "supplier_debt_supplierId_idx" ON "supplier_debt"("supplierId");
CREATE INDEX "supplier_debt_status_idx" ON "supplier_debt"("status");
CREATE INDEX "supplier_debt_dueDate_idx" ON "supplier_debt"("dueDate");

CREATE INDEX "supplier_debt_payment_debtId_idx" ON "supplier_debt_payment"("debtId");
CREATE INDEX "supplier_debt_payment_paymentDate_idx" ON "supplier_debt_payment"("paymentDate");

ALTER TABLE "supplier"
ADD CONSTRAINT "supplier_tokoId_fkey"
FOREIGN KEY ("tokoId") REFERENCES "toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_debt"
ADD CONSTRAINT "supplier_debt_tokoId_fkey"
FOREIGN KEY ("tokoId") REFERENCES "toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_debt"
ADD CONSTRAINT "supplier_debt_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_debt_payment"
ADD CONSTRAINT "supplier_debt_payment_debtId_fkey"
FOREIGN KEY ("debtId") REFERENCES "supplier_debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
