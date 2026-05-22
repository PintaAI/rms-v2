import prisma from "@/lib/prisma";
import type { ActivityType } from "@/prisma/generated/prisma/enums";
import type { Prisma, PrismaClient } from "@/prisma/generated/prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

type CreateActivityLogInput = {
  storeId: string;
  userId: string;
  type: ActivityType;
  title: string;
  repairOrderId?: string | null;
  payload?: Prisma.InputJsonValue;
};

type DeletedServiceSnapshotInput = {
  id: string;
  storeId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  handlingNote?: string | null;
  status: string;
  imei: string | null;
  note: string | null;
  deviceModel: {
    id: string;
    modelName: string;
    brand: { name: string };
  };
};

function buildDeletedServiceSnapshot(service: DeletedServiceSnapshotInput): Prisma.InputJsonObject {
  return {
    deletedServiceId: service.id,
    storeId: service.storeId,
    customerName: service.customerName,
    noWa: service.noWa,
    complaint: service.complaint,
    handlingNote: service.handlingNote ?? null,
    status: service.status,
    imei: service.imei,
    note: service.note,
    deviceModel: {
      id: service.deviceModel.id,
      brandName: service.deviceModel.brand.name,
      modelName: service.deviceModel.modelName,
    },
    deletedAt: new Date().toISOString(),
  } satisfies Prisma.InputJsonObject;
}

export async function preserveDeletedServiceActivityLogs(
  db: DbClient,
  repairOrderId: string,
  service: DeletedServiceSnapshotInput
) {
  const deletedServiceSnapshot = buildDeletedServiceSnapshot(service);
  const activities = await db.activityLog.findMany({
    where: { repairOrderId },
    select: { id: true, payload: true },
  });

  await Promise.all(
    activities.map((activity) => {
      const existingPayload =
        activity.payload && typeof activity.payload === "object" && !Array.isArray(activity.payload)
          ? (activity.payload as Prisma.InputJsonObject)
          : {};

      return db.activityLog.update({
        where: { id: activity.id },
        data: {
          repairOrderId: null,
          payload: {
            ...existingPayload,
            deletedService: deletedServiceSnapshot,
          },
        },
      });
    })
  );
}

export async function createActivityLog(
  db: DbClient,
  { storeId, userId, type, title, repairOrderId, payload }: CreateActivityLogInput
) {
  return db.activityLog.create({
    data: {
      storeId,
      userId,
      type,
      title,
      repairOrderId: repairOrderId ?? null,
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
