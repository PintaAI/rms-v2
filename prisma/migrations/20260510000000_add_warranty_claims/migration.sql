ALTER TYPE "ActivityType" ADD VALUE 'warranty_claim_created';
ALTER TYPE "ActivityType" ADD VALUE 'warranty_claim_resolved';

CREATE TYPE "WarrantyClaimStatus" AS ENUM ('open', 'resolved', 'rejected');
CREATE TYPE "WarrantyClaimResolution" AS ENUM ('free_repair', 'cash_refund', 'no_action');

CREATE TABLE "warranty_claim" (
  "id" TEXT NOT NULL,
  "tokoId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "status" "WarrantyClaimStatus" NOT NULL DEFAULT 'open',
  "resolution" "WarrantyClaimResolution",
  "reason" TEXT NOT NULL,
  "customerNote" TEXT,
  "technicianNote" TEXT,
  "refundAmount" INTEGER NOT NULL DEFAULT 0,
  "resolvedNote" TEXT,
  "createdById" TEXT NOT NULL,
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "warranty_claim_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "warranty_claim"
ADD CONSTRAINT "warranty_claim_tokoId_fkey"
FOREIGN KEY ("tokoId") REFERENCES "toko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "warranty_claim"
ADD CONSTRAINT "warranty_claim_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "warranty_claim"
ADD CONSTRAINT "warranty_claim_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "warranty_claim"
ADD CONSTRAINT "warranty_claim_resolvedById_fkey"
FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "warranty_claim_tokoId_idx" ON "warranty_claim"("tokoId");
CREATE INDEX "warranty_claim_serviceId_idx" ON "warranty_claim"("serviceId");
CREATE INDEX "warranty_claim_status_idx" ON "warranty_claim"("status");
CREATE INDEX "warranty_claim_createdAt_idx" ON "warranty_claim"("createdAt");
