import prisma from "@/lib/prisma";
import type { ActivityType } from "@/prisma/generated/prisma/enums";
import type { Prisma, PrismaClient } from "@/prisma/generated/prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

type CreateActivityLogInput = {
  tokoId: string;
  userId: string;
  type: ActivityType;
  title: string;
  serviceId?: string | null;
  payload?: Prisma.InputJsonValue;
};

export async function createActivityLog(
  db: DbClient,
  { tokoId, userId, type, title, serviceId, payload }: CreateActivityLogInput
) {
  return db.activityLog.create({
    data: {
      tokoId,
      userId,
      type,
      title,
      serviceId: serviceId ?? null,
      payload,
    },
  });
}

export async function createActivityLogIfUser(
  input: Omit<CreateActivityLogInput, "userId"> & { userId?: string | null },
) {
  if (!input.userId) return null;

  return createActivityLog(prisma, {
    ...input,
    userId: input.userId,
  });
}
