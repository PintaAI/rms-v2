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

type DeletedServiceSnapshotInput = {
  id: string;
  tokoId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  status: string;
  imei: string | null;
  note: string | null;
  hpCatalog: {
    id: string;
    modelName: string;
    brand: { name: string };
  };
};

function buildDeletedServiceSnapshot(service: DeletedServiceSnapshotInput): Prisma.InputJsonObject {
  return {
    deletedServiceId: service.id,
    tokoId: service.tokoId,
    customerName: service.customerName,
    noWa: service.noWa,
    complaint: service.complaint,
    status: service.status,
    imei: service.imei,
    note: service.note,
    hpCatalog: {
      id: service.hpCatalog.id,
      brandName: service.hpCatalog.brand.name,
      modelName: service.hpCatalog.modelName,
    },
    deletedAt: new Date().toISOString(),
  } satisfies Prisma.InputJsonObject;
}

export async function preserveDeletedServiceActivityLogs(
  db: DbClient,
  serviceId: string,
  service: DeletedServiceSnapshotInput
) {
  const deletedServiceSnapshot = buildDeletedServiceSnapshot(service);
  const activities = await db.activityLog.findMany({
    where: { serviceId },
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
          serviceId: null,
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
