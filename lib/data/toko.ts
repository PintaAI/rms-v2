import { cache } from "react";
import prisma from "@/lib/prisma";

export interface TokoItem {
  id: string;
  name: string;
  status: string;
  role: string;
  logoUrl: string | null;
  address: string | null;
}

export const getTokoListForUser = cache(async (userId: string): Promise<TokoItem[]> => {
  const assignments = await prisma.userStore.findMany({
    where: { userId },
    include: {
      store: {
        select: { id: true, name: true, status: true, logoUrl: true, address: true },
      },
    },
  });

  return assignments.map((a) => ({
    id: a.store.id,
    name: a.store.name,
    status: a.store.status,
    role: a.role,
    logoUrl: a.store.logoUrl,
    address: a.store.address,
  }));
});
