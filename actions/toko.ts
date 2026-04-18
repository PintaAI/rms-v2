"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { hashPassword } from "@better-auth/utils/password";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

interface UserData {
  name: string;
  email: string;
  password: string;
}

interface CreateTokoInput {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  staff: UserData[];
  technician: UserData[];
}

interface CreateTokoResult {
  success: boolean;
  tokoId?: string;
  error?: string;
}

interface TokoDetail {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateTokoInput {
  name?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  status?: "active" | "inactive";
}

export async function createTokoWithUsers(input: CreateTokoInput): Promise<CreateTokoResult> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { success: false, error: "Only admins can create toko" };
  }

  const existingToko = await prisma.userToko.findFirst({
    where: { userId: session.user.id },
  });

  if (existingToko) {
    return { success: false, error: "Admin already has a toko" };
  }

  const allEmails = [...input.staff.map(s => s.email), ...input.technician.map(t => t.email)];
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: allEmails } },
    select: { email: true },
  });

  if (existingUsers.length > 0) {
    const duplicateEmails = existingUsers.map(u => u.email).join(", ");
    return { success: false, error: `Emails already registered: ${duplicateEmails}` };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const toko = await tx.toko.create({
        data: {
          name: input.name,
          logoUrl: input.logoUrl,
          address: input.address,
          phone: input.phone,
          status: "active",
        },
      });

      await tx.userToko.create({
        data: {
          userId: session.user.id,
          tokoId: toko.id,
          role: "owner",
        },
      });

      for (const staff of input.staff) {
        const hashedPassword = await hashPassword(staff.password);
        const userId = nanoid();

        await tx.user.create({
          data: {
            id: userId,
            name: staff.name,
            email: staff.email,
            role: "staff",
            emailVerified: false,
          },
        });

        await tx.account.create({
          data: {
            id: nanoid(),
            accountId: userId,
            providerId: "credential",
            userId: userId,
            password: hashedPassword,
          },
        });

        await tx.userToko.create({
          data: {
            userId: userId,
            tokoId: toko.id,
            role: "owner",
          },
        });
      }

      for (const tech of input.technician) {
        const hashedPassword = await hashPassword(tech.password);
        const userId = nanoid();

        await tx.user.create({
          data: {
            id: userId,
            name: tech.name,
            email: tech.email,
            role: "technician",
            emailVerified: false,
          },
        });

        await tx.account.create({
          data: {
            id: nanoid(),
            accountId: userId,
            providerId: "credential",
            userId: userId,
            password: hashedPassword,
          },
        });

        await tx.userToko.create({
          data: {
            userId: userId,
            tokoId: toko.id,
            role: "owner",
          },
        });
      }

      return toko.id;
    });

    return { success: true, tokoId: result };
  } catch (error) {
    console.error("Failed to create toko:", error);
    return { success: false, error: "Failed to create toko. Please try again." };
  }
}

export async function createToko(input: {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
}): Promise<CreateTokoResult> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { success: false, error: "Only admins can create toko" };
  }

  if (!input.name.trim() || input.name.trim().length < 2) {
    return { success: false, error: "Toko name must be at least 2 characters" };
  }

  try {
    const toko = await prisma.toko.create({
      data: {
        name: input.name.trim(),
        logoUrl: input.logoUrl?.trim(),
        address: input.address?.trim(),
        phone: input.phone?.trim(),
        status: "active",
      },
    });

    await prisma.userToko.create({
      data: {
        userId: session.user.id,
        tokoId: toko.id,
        role: "owner",
      },
    });

    revalidatePath("/dashboard");

    return { success: true, tokoId: toko.id };
  } catch (error) {
    console.error("Failed to create toko:", error);
    return { success: false, error: "Failed to create toko" };
  }
}

export async function getTokoById(tokoId: string): Promise<{ success: boolean; data?: TokoDetail; error?: string }> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const userToko = await prisma.userToko.findFirst({
    where: { userId: session.user.id, tokoId },
  });

  if (!userToko) {
    return { success: false, error: "Access denied" };
  }

  const toko = await prisma.toko.findUnique({
    where: { id: tokoId },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      logoUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!toko) {
    return { success: false, error: "Toko not found" };
  }

  return { success: true, data: toko };
}

export async function updateToko(
  tokoId: string,
  input: UpdateTokoInput
): Promise<{ success: boolean; data?: TokoDetail; error?: string }> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { success: false, error: "Only admins can update toko" };
  }

  const userToko = await prisma.userToko.findFirst({
    where: { userId: session.user.id, tokoId },
  });

  if (!userToko) {
    return { success: false, error: "Access denied" };
  }

  if (input.name && input.name.trim().length < 2) {
    return { success: false, error: "Toko name must be at least 2 characters" };
  }

  try {
    const toko = await prisma.toko.update({
      where: { id: tokoId },
      data: {
        name: input.name?.trim(),
        address: input.address?.trim(),
        phone: input.phone?.trim(),
        logoUrl: input.logoUrl?.trim(),
        status: input.status,
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        logoUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath(`/${tokoId}/admin/toko`);
    revalidatePath(`/${tokoId}/admin`);

    return { success: true, data: toko };
  } catch (error) {
    console.error("Failed to update toko:", error);
    return { success: false, error: "Failed to update toko" };
  }
}

export async function deleteToko(tokoId: string): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { success: false, error: "Only admins can delete toko" };
  }

  const userTokoList = await prisma.userToko.findMany({
    where: { userId: session.user.id },
    select: { tokoId: true },
  });

  const tokoIds = userTokoList.map((ut) => ut.tokoId);

  if (!tokoIds.includes(tokoId)) {
    return { success: false, error: "Access denied" };
  }

  if (tokoIds.length === 1) {
    return { success: false, error: "Cannot delete the last toko. You must have at least one toko." };
  }

  try {
    await prisma.toko.delete({
      where: { id: tokoId },
    });

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete toko:", error);
    return { success: false, error: "Failed to delete toko" };
  }
}