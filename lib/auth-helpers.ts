import { hashPassword } from "@better-auth/utils/password";
import { nanoid } from "nanoid";
import type { Prisma } from "@/prisma/generated/prisma/client";

interface CreateCredentialUserInput {
  name: string;
  email: string;
  password: string;
  role: "staff" | "technician";
  storeId: string;
  tokoRole?: "owner";
}

interface CreatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export async function createCredentialUserWithToko(
  tx: Prisma.TransactionClient,
  input: CreateCredentialUserInput
): Promise<CreatedUser> {
  const hashedPassword = await hashPassword(input.password);
  const userId = nanoid();

  const user = await tx.user.create({
    data: {
      id: userId,
      name: input.name.trim(),
      email: input.email.trim(),
      role: input.role,
      emailVerified: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
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

  await tx.userStore.create({
    data: {
      userId: userId,
      storeId: input.storeId,
      role: input.tokoRole ?? "owner",
    },
  });

  return user;
}
