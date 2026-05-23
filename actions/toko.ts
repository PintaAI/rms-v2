"use server";

import prisma from "@/lib/prisma";
import { ensurePlanLimit } from "@/lib/auth/enforcement";
import { AuthError } from "@/lib/auth/authorization";
import { assertPermission } from "@/lib/auth/request-scope";
import { FEATURE_REGISTRY, isFeatureKey, isPlanAtLeast, type FeatureKey } from "@/lib/features";
import { getRequestUser } from "@/lib/auth/request-user";
import { withScope } from "@/lib/auth/wrapper";
import { createCredentialUserWithToko } from "@/lib/auth-helpers";
import { revalidateTokoPaths } from "@/lib/revalidation";
import { Prisma } from "@/prisma/generated/prisma/client";
import { revalidatePath } from "next/cache";

interface UserData {
  name: string;
  password: string;
}

interface CreatedUserCredential {
  name: string;
  email: string;
  password: string;
  role: "staff" | "technician";
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
  storeId?: string;
  error?: string;
  users?: CreatedUserCredential[];
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

export interface TokoHeaderData {
  id: string;
  name: string;
  logoUrl: string | null;
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

const sanitizeForEmail = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function generateKaryawanEmail(
  name: string,
  role: "staff" | "technician",
  tokoName: string,
  existingEmails: Set<string>
): string {
  const localPart = sanitizeForEmail(name);
  const domainPart = sanitizeForEmail(tokoName);

  let email = `${localPart}-${role}@${domainPart}.com`;
  let counter = 1;

  while (existingEmails.has(email)) {
    counter++;
    email = `${localPart}-${role}-${counter}@${domainPart}.com`;
  }

  existingEmails.add(email);
  return email;
}

export async function createTokoWithUsers(input: CreateTokoInput): Promise<CreateTokoResult> {
  const user = await getRequestUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (user.role !== "admin") {
    return { success: false, error: "Only admins can create toko" };
  }

  const tokoLimitError = ensurePlanLimit(user, "maxTokos", user.storeIds.length);
  if (tokoLimitError) return tokoLimitError;

  const staffLimitError = ensurePlanLimit(user, "maxStaff", 0, input.staff.length);
  if (staffLimitError) return staffLimitError;

  const technicianLimitError = ensurePlanLimit(user, "maxTechnicians", 0, input.technician.length);
  if (technicianLimitError) return technicianLimitError;

  const disabledFeatures = getAllowedDisabledFeatures(input.disabledFeatures ?? [], user.plan);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const storeCount = await tx.userStore.count({ where: { userId: user.id } });
      const tokoLimitError = ensurePlanLimit(user, "maxTokos", storeCount);
      if (tokoLimitError) throw new Error(tokoLimitError.error);

      const staffLimitError = ensurePlanLimit(user, "maxStaff", 0, input.staff.length);
      if (staffLimitError) throw new Error(staffLimitError.error);

      const technicianLimitError = ensurePlanLimit(user, "maxTechnicians", 0, input.technician.length);
      if (technicianLimitError) throw new Error(technicianLimitError.error);

      const toko = await tx.store.create({
        data: {
          name: input.name,
          logoUrl: input.logoUrl,
          address: input.address,
          phone: input.phone,
          status: "active",
        },
      });

      await tx.userStore.create({
        data: {
          userId: user.id,
          storeId: toko.id,
          role: "owner",
        },
      });

      if (disabledFeatures.length > 0) {
        await tx.storeFeatureSetting.create({
          data: {
            storeId: toko.id,
            disabledFeatures: JSON.stringify(disabledFeatures),
          },
        });
      }

      const existingEmails = new Set<string>();
      const createdUsers: CreatedUserCredential[] = [];

      for (const staff of input.staff) {
        const email = generateKaryawanEmail(staff.name, "staff", input.name, existingEmails);
        await createCredentialUserWithToko(tx, {
          name: staff.name,
          email,
          password: staff.password,
          role: "staff",
          storeId: toko.id,
        });
        createdUsers.push({ name: staff.name, email, password: staff.password, role: "staff" });
      }

      for (const tech of input.technician) {
        const email = generateKaryawanEmail(tech.name, "technician", input.name, existingEmails);
        await createCredentialUserWithToko(tx, {
          name: tech.name,
          email,
          password: tech.password,
          role: "technician",
          storeId: toko.id,
        });
        createdUsers.push({ name: tech.name, email, password: tech.password, role: "technician" });
      }

      return { storeId: toko.id, users: createdUsers };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return { success: true, storeId: result.storeId, users: result.users };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Your ")) {
      return { success: false, error: error.message };
    }
    console.error("Failed to create toko:", error);
    return { success: false, error: "Failed to create toko. Please try again." };
  }
}

function getAllowedDisabledFeatures(features: FeatureKey[], plan: string | null | undefined): FeatureKey[] {
  const disabledFeatures = new Set([...new Set(features)].filter((feature) => {
    if (!isFeatureKey(feature)) return false;

    const metadata = FEATURE_REGISTRY[feature];
    return metadata.configurable && isPlanAtLeast(plan, metadata.minimumPlan);
  }));

  if (plan === "free") {
    const serviceDisabled = disabledFeatures.has("service.management");
    const retailDisabled = disabledFeatures.has("retail.sales");

    if (serviceDisabled && retailDisabled) {
      disabledFeatures.delete("service.management");
    } else if (!serviceDisabled && !retailDisabled) {
      disabledFeatures.add("retail.sales");
    }
  }

  return [...disabledFeatures];
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

  const tokoLimitError = ensurePlanLimit(user, "maxTokos", user.storeIds.length);
  if (tokoLimitError) return tokoLimitError;

  try {
    const toko = await prisma.$transaction(async (tx) => {
      const storeCount = await tx.userStore.count({ where: { userId: user.id } });
      const tokoLimitError = ensurePlanLimit(user, "maxTokos", storeCount);
      if (tokoLimitError) throw new Error(tokoLimitError.error);

      const createdToko = await tx.store.create({
        data: {
          name: input.name.trim(),
          logoUrl: input.logoUrl?.trim(),
          address: input.address?.trim(),
          phone: input.phone?.trim(),
          status: "active",
        },
      });

      await tx.userStore.create({
        data: {
          userId: user.id,
          storeId: createdToko.id,
          role: "owner",
        },
      });

      return createdToko;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/dashboard");

    return { success: true, storeId: toko.id };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Your ")) {
      return { success: false, error: error.message };
    }
    console.error("Failed to create toko:", error);
    return { success: false, error: "Failed to create toko" };
  }
}

export async function getTokoById(storeId: string): Promise<{ success: boolean; data?: TokoDetail; error?: string }> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "toko.viewSettings");

    const toko = await prisma.store.findUnique({
      where: { id: storeId },
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

    if (!toko) throw new AuthError("forbidden", "Toko not found");

    return toko;
  });
}

export async function getTokoHeader(storeId: string): Promise<{ success: boolean; data?: TokoHeaderData | null; error?: string }> {
  return withScope(storeId, {}, async () => {
    return prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, logoUrl: true },
    });
  });
}

export async function updateToko(
  storeId: string,
  input: UpdateTokoInput
): Promise<{ success: boolean; data?: TokoDetail; error?: string }> {
  if (input.name && input.name.trim().length < 2) {
    return { success: false, error: "Toko name must be at least 2 characters" };
  }

  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "toko.viewSettings");

    const toko = await prisma.store.update({
      where: { id: storeId },
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

    revalidateTokoPaths(storeId);

    return toko;
  });
}

export async function getTokoInvoiceSettings(storeId: string): Promise<{
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
  return withScope(storeId, {}, async () => {
    const toko = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        name: true,
        address: true,
        phone: true,
        logoUrl: true,
        invoiceTerms: true,
        invoiceWarranty: true,
      },
    });

    if (!toko) throw new AuthError("forbidden", "Toko not found");

    return {
      name: toko.name,
      address: toko.address,
      phone: toko.phone,
      logoUrl: toko.logoUrl,
      invoiceTerms: toko.invoiceTerms?.trim() || DEFAULT_INVOICE_TERMS,
      invoiceWarranty: toko.invoiceWarranty?.trim() || DEFAULT_INVOICE_WARRANTY,
    };
  });
}

export async function deleteToko(storeId: string): Promise<{ success: boolean; error?: string }> {
  return withScope(storeId, {}, async (scope) => {
    assertPermission(scope, "toko.manageOperational");

    if (scope.user.storeIds.length === 1) {
      return { success: false, error: "Cannot delete the last toko. You must have at least one toko." };
    }

    await prisma.store.delete({
      where: { id: storeId },
    });

    revalidatePath("/dashboard");

    return { success: true };
  });
}
