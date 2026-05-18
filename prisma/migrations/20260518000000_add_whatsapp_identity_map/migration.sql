CREATE TABLE "toko_whatsapp_identity" (
  "id" TEXT NOT NULL,
  "tokoId" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "phoneJid" TEXT,
  "lidJid" TEXT,
  "displayName" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "toko_whatsapp_identity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "toko_whatsapp_identity_tokoId_phoneNumber_key" ON "toko_whatsapp_identity"("tokoId", "phoneNumber");
CREATE INDEX "toko_whatsapp_identity_tokoId_phoneJid_idx" ON "toko_whatsapp_identity"("tokoId", "phoneJid");
CREATE INDEX "toko_whatsapp_identity_tokoId_lidJid_idx" ON "toko_whatsapp_identity"("tokoId", "lidJid");

ALTER TABLE "toko_whatsapp_identity" ADD CONSTRAINT "toko_whatsapp_identity_tokoId_fkey" FOREIGN KEY ("tokoId") REFERENCES "toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;
