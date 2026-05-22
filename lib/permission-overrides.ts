import prisma from "@/lib/prisma";
import {
  isPermissionKey,
  type PermissionEffect,
  type PermissionOverrideInput,
} from "@/lib/permissions";

function isPermissionEffect(value: string): value is PermissionEffect {
  return value === "allow" || value === "deny";
}

export async function getUserPermissionOverrides(
  storeId: string,
  userId: string,
): Promise<PermissionOverrideInput[]> {
  const membership = await prisma.userStore.findUnique({
    where: { userId_storeId: { userId, storeId } },
    select: { userId: true },
  });

  if (!membership) return [];

  const overrides = await prisma.storeUserPermission.findMany({
    where: { storeId, userId },
    select: { permissionKey: true, effect: true },
    orderBy: { permissionKey: "asc" },
  });

  return overrides.flatMap((override) => {
    if (!isPermissionKey(override.permissionKey)) return [];
    if (!isPermissionEffect(override.effect)) return [];

    return [{ permissionKey: override.permissionKey, effect: override.effect }];
  });
}
