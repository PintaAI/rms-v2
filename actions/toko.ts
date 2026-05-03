"use server";

import prisma from "@/lib/prisma";
import { ensurePlanLimit } from "@/lib/auth/enforcement";
import { FEATURE_REGISTRY, isFeatureKey, isPlanAtLeast, type FeatureKey } from "@/lib/features";
import { getRequestUser } from "@/lib/auth/request-user";
import { createCredentialUserWithToko } from "@/lib/auth-helpers";
import { revalidateTokoPaths } from "@/lib/revalidation";
import { Prisma } from "@/prisma/generated/prisma/client";
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
  disabledFeatures?: FeatureKey[];
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
  invoiceTerms: string | null;
  invoiceWarranty: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateTokoInput {
  name?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  invoiceTerms?: string;
  invoiceWarranty?: string;
  status?: "active" | "inactive";
}

const DEFAULT_INVOICE_TERMS = "Barang yang tidak diambil lebih dari 30 hari di luar tanggung jawab toko.";
const DEFAULT_INVOICE_WARRANTY = "Garansi berlaku sesuai jenis kerusakan dan tidak berlaku untuk kerusakan fisik/cairan.";

export async function createTokoWithUsers(input: CreateTokoInput): Promise<CreateTokoResult> {
  const user = await getRequestUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (user.role !== "admin") {
    return { success: false, error: "Only admins can create toko" };
  }

  const tokoLimitError = ensurePlanLimit(user, "maxTokos", user.tokoIds.length);
  if (tokoLimitError) return tokoLimitError;

  const staffLimitError = ensurePlanLimit(user, "maxStaff", 0, input.staff.length);
  if (staffLimitError) return staffLimitError;

  const technicianLimitError = ensurePlanLimit(user, "maxTechnicians", 0, input.technician.length);
  if (technicianLimitError) return technicianLimitError;

  const allEmails = [...input.staff.map(s => s.email), ...input.technician.map(t => t.email)];
  const disabledFeatures = getAllowedDisabledFeatures(input.disabledFeatures ?? [], user.plan);
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
      const tokoCount = await tx.userToko.count({ where: { userId: user.id } });
      const tokoLimitError = ensurePlanLimit(user, "maxTokos", tokoCount);
      if (tokoLimitError) throw new Error(tokoLimitError.error);

      const staffLimitError = ensurePlanLimit(user, "maxStaff", 0, input.staff.length);
      if (staffLimitError) throw new Error(staffLimitError.error);

      const technicianLimitError = ensurePlanLimit(user, "maxTechnicians", 0, input.technician.length);
      if (technicianLimitError) throw new Error(technicianLimitError.error);

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
          userId: user.id,
          tokoId: toko.id,
          role: "owner",
        },
      });

      if (disabledFeatures.length > 0) {
        await tx.tokoFeatureSetting.create({
          data: {
            tokoId: toko.id,
            disabledFeatures: JSON.stringify(disabledFeatures),
          },
        });
      }

      for (const staff of input.staff) {
        await createCredentialUserWithToko(tx, {
          name: staff.name,
          email: staff.email,
          password: staff.password,
          role: "staff",
          tokoId: toko.id,
        });
      }

      for (const tech of input.technician) {
        await createCredentialUserWithToko(tx, {
          name: tech.name,
          email: tech.email,
          password: tech.password,
          role: "technician",
          tokoId: toko.id,
        });
      }

      return toko.id;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return { success: true, tokoId: result };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Your ")) {
      return { success: false, error: error.message };
    }
    console.error("Failed to create toko:", error);
    return { success: false, error: "Failed to create toko. Please try again." };
  }
}

function getAllowedDisabledFeatures(features: FeatureKey[], plan: string | null | undefined): FeatureKey[] {
  return [...new Set(features)].filter((feature) => {
    if (!isFeatureKey(feature)) return false;

    const metadata = FEATURE_REGISTRY[feature];
    return metadata.configurable && isPlanAtLeast(plan, metadata.minimumPlan);
  });
}

export async function createToko(input: {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
}): Promise<CreateTokoResult> {
  const user = await getRequestUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (user.role !== "admin") {
    return { success: false, error: "Only admins can create toko" };
  }

  if (!input.name.trim() || input.name.trim().length < 2) {
    return { success: false, error: "Toko name must be at least 2 characters" };
  }

  const tokoLimitError = ensurePlanLimit(user, "maxTokos", user.tokoIds.length);
  if (tokoLimitError) return tokoLimitError;

  try {
    const toko = await prisma.$transaction(async (tx) => {
      const tokoCount = await tx.userToko.count({ where: { userId: user.id } });
      const tokoLimitError = ensurePlanLimit(user, "maxTokos", tokoCount);
      if (tokoLimitError) throw new Error(tokoLimitError.error);

      const createdToko = await tx.toko.create({
        data: {
          name: input.name.trim(),
          logoUrl: input.logoUrl?.trim(),
          address: input.address?.trim(),
          phone: input.phone?.trim(),
          status: "active",
        },
      });

      await tx.userToko.create({
        data: {
          userId: user.id,
          tokoId: createdToko.id,
          role: "owner",
        },
      });

      return createdToko;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/dashboard");

    return { success: true, tokoId: toko.id };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Your ")) {
      return { success: false, error: error.message };
    }
    console.error("Failed to create toko:", error);
    return { success: false, error: "Failed to create toko" };
  }
}

export async function getTokoById(tokoId: string): Promise<{ success: boolean; data?: TokoDetail; error?: string }> {
  const user = await getRequestUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!user.tokoIds.includes(tokoId)) {
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
      invoiceTerms: true,
      invoiceWarranty: true,
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
  const user = await getRequestUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (user.role !== "admin") {
    return { success: false, error: "Only admins can update toko" };
  }

  if (!user.tokoIds.includes(tokoId)) {
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
        invoiceTerms: input.invoiceTerms?.trim(),
        invoiceWarranty: input.invoiceWarranty?.trim(),
        status: input.status,
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        logoUrl: true,
        invoiceTerms: true,
        invoiceWarranty: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidateTokoPaths(tokoId);

    return { success: true, data: toko };
  } catch (error) {
    console.error("Failed to update toko:", error);
    return { success: false, error: "Failed to update toko" };
  }
}

export async function getTokoInvoiceSettings(tokoId: string): Promise<{
  success: boolean;
  data?: {
    name: string;
    address: string | null;
    phone: string | null;
    logoUrl: string | null;
    invoiceTerms: string;
    invoiceWarranty: string;
  };
  error?: string;
}> {
  const user = await getRequestUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!user.tokoIds.includes(tokoId)) {
    return { success: false, error: "Access denied" };
  }

  const toko = await prisma.toko.findUnique({
    where: { id: tokoId },
    select: {
      name: true,
      address: true,
      phone: true,
      logoUrl: true,
      invoiceTerms: true,
      invoiceWarranty: true,
    },
  });

  if (!toko) {
    return { success: false, error: "Toko not found" };
  }

  return {
    success: true,
    data: {
      name: toko.name,
      address: toko.address,
      phone: toko.phone,
      logoUrl: toko.logoUrl,
      invoiceTerms: toko.invoiceTerms?.trim() || DEFAULT_INVOICE_TERMS,
      invoiceWarranty: toko.invoiceWarranty?.trim() || DEFAULT_INVOICE_WARRANTY,
    },
  };
}

export async function deleteToko(tokoId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getRequestUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (user.role !== "admin") {
    return { success: false, error: "Only admins can delete toko" };
  }

  const tokoIds = user.tokoIds;

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
