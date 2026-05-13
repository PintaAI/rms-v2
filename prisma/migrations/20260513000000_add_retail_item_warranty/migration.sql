ALTER TABLE "sparepart" ADD COLUMN "warrantyDays" INTEGER;

ALTER TABLE "retail_sale_item" ADD COLUMN "warrantyDaysSnapshot" INTEGER;
ALTER TABLE "retail_sale_item" ADD COLUMN "warrantyUntil" TIMESTAMP(3);
