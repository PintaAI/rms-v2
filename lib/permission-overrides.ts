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
  tokoId: string,
  userId: string,
): Promise<PermissionOverrideInput[]> {
  const membership = await prisma.userToko.findUnique({
    where: { userId_tokoId: { userId, tokoId } },
    select: { userId: true },
  });

  if (!membership) return [];

  const overrides = await prisma.tokoUserPermission.findMany({
    where: { tokoId, userId },
    select: { permissionKey: true, effect: true },
    orderBy: { permissionKey: "asc" },
  });

  return overrides.flatMap((override) => {
    if (!isPermissionKey(override.permissionKey)) return [];
    if (!isPermissionEffect(override.effect)) return [];

    return [{ permissionKey: override.permissionKey, effect: override.effect }];
  });
}
