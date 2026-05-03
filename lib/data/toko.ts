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
  const assignments = await prisma.userToko.findMany({
    where: { userId },
    include: {
      toko: {
        select: { id: true, name: true, status: true, logoUrl: true, address: true },
      },
    },
  });

  return assignments.map((a) => ({
    id: a.toko.id,
    name: a.toko.name,
    status: a.toko.status,
    role: a.role,
    logoUrl: a.toko.logoUrl,
    address: a.toko.address,
  }));
});
