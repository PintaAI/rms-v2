"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export async function getUserTokoList() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    return [];
  }

  const assignments = await prisma.userToko.findMany({
    where: { userId: session.user.id },
    include: {
      toko: {
        select: {
          id: true,
          name: true,
          status: true,
          logoUrl: true,
        },
      },
    },
  });

  return assignments.map((a) => ({
    id: a.toko.id,
    name: a.toko.name,
    status: a.toko.status,
    role: a.role,
    logoUrl: a.toko.logoUrl,
  }));
}