CREATE TYPE "PermissionEffect" AS ENUM ('allow', 'deny');

CREATE TABLE "toko_user_permission" (
  "id" TEXT NOT NULL,
  "tokoId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "permissionKey" TEXT NOT NULL,
  "effect" "PermissionEffect" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "toko_user_permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "toko_user_permission_tokoId_userId_permissionKey_key"
ON "toko_user_permission"("tokoId", "userId", "permissionKey");

CREATE INDEX "toko_user_permission_tokoId_userId_idx"
ON "toko_user_permission"("tokoId", "userId");

CREATE INDEX "toko_user_permission_userId_idx"
ON "toko_user_permission"("userId");

ALTER TABLE "toko_user_permission"
ADD CONSTRAINT "toko_user_permission_tokoId_fkey"
FOREIGN KEY ("tokoId") REFERENCES "toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "toko_user_permission"
ADD CONSTRAINT "toko_user_permission_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
