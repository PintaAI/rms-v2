import "dotenv/config";

import { hashPassword } from "@better-auth/utils/password";
import { PrismaPg } from "@prisma/adapter-pg";
import { nanoid } from "nanoid";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const password = "test1234";
const tokoId = "optimistic-test-toko";
const adminId = "optimistic-test-admin";
const staffId = "optimistic-test-staff";
const brandName = "Optimistic Test Brand";

async function upsertCredentialUser(input: {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
}) {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      emailVerified: true,
    },
    create: {
      id: input.id,
      name: input.name,
      email: input.email,
      role: input.role,
      emailVerified: true,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });

  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { accountId: user.id, password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        id: nanoid(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
      },
    });
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { plan: input.role === "admin" ? "enterprise" : "free", status: "active" },
    create: { userId: user.id, plan: input.role === "admin" ? "enterprise" : "free", status: "active" },
  });

  return user;
}

async function main() {
  const [admin, staff] = await Promise.all([
    upsertCredentialUser({
      id: adminId,
      name: "Optimistic Admin",
      email: "optimistic-admin@seed.local",
      role: "admin",
    }),
    upsertCredentialUser({
      id: staffId,
      name: "Optimistic Staff",
      email: "optimistic-staff@seed.local",
      role: "staff",
    }),
  ]);

  await prisma.store.upsert({
    where: { id: tokoId },
    update: { name: "Optimistic Test Toko", status: "active" },
    create: { id: tokoId, name: "Optimistic Test Toko", status: "active" },
  });

  await Promise.all([
    prisma.userStore.upsert({
      where: { userId_storeId: { userId: admin.id, storeId: tokoId } },
      update: {},
      create: { userId: admin.id, storeId: tokoId },
    }),
    prisma.userStore.upsert({
      where: { userId_storeId: { userId: staff.id, storeId: tokoId } },
      update: {},
      create: { userId: staff.id, storeId: tokoId },
    }),
  ]);

  const deviceBrand = await prisma.deviceBrand.upsert({
    where: { name: brandName },
    update: {},
    create: { name: brandName },
  });

  const deviceModel = await prisma.deviceModel.upsert({
    where: { brandId_modelName: { brandId: deviceBrand.id, modelName: "Phone A1" } },
    update: {},
    create: { brandId: deviceBrand.id, modelName: "Phone A1" },
  });

  await Promise.all([
    prisma.repairOrder.upsert({
      where: { id: "optimistic-test-service-received" },
      update: {
        status: "received",
        isPickedUp: false,
        customerName: "Received Customer",
        noWa: "081234567890",
        complaint: "Initial received test service",
      },
      create: {
        id: "optimistic-test-service-received",
        storeId: tokoId,
        deviceModelId: deviceModel.id,
        createdById: admin.id,
        customerName: "Received Customer",
        noWa: "081234567890",
        complaint: "Initial received test service",
        status: "received",
      },
    }),
    prisma.repairOrder.upsert({
      where: { id: "optimistic-test-service-repairing" },
      update: {
        status: "repairing",
        isPickedUp: false,
        customerName: "Repairing Customer",
        noWa: "081234567891",
        complaint: "Initial repairing test service",
      },
      create: {
        id: "optimistic-test-service-repairing",
        storeId: tokoId,
        deviceModelId: deviceModel.id,
        createdById: admin.id,
        customerName: "Repairing Customer",
        noWa: "081234567891",
        complaint: "Initial repairing test service",
        status: "repairing",
      },
    }),
  ]);

  console.log("Optimistic test seed ready");
  console.log("Admin: optimistic-admin@seed.local / test1234");
  console.log("Staff: optimistic-staff@seed.local / test1234");
  console.log(`Toko ID: ${tokoId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
