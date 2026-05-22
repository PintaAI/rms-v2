import "dotenv/config";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { faker } from "@faker-js/faker";
import { hashPassword } from "@better-auth/utils/password";
import { PrismaPg } from "@prisma/adapter-pg";
import { nanoid } from "nanoid";
import { Prisma, PrismaClient, type UserRole } from "./generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run demo service seed");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEMO_TOKO_NAME = "Demo Service Seed Toko";
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "password";
const TARGET_SERVICE_COUNT = Number(process.env.DEMO_SERVICE_COUNT || 1000);

const demoUsers = [
  { name: "Demo Admin", email: "admin@demo.test", role: "admin" },
  { name: "Demo Staff", email: "staff@demo.test", role: "staff" },
  { name: "Demo Teknisi", email: "teknisi@demo.test", role: "technician" },
] as const satisfies ReadonlyArray<{ name: string; email: string; role: UserRole }>;

const demoCatalog = [
  { brand: "Samsung", models: ["Galaxy A15", "Galaxy A24", "Galaxy S21", "Galaxy M14"] },
  { brand: "Xiaomi", models: ["Redmi Note 12", "POCO X3", "Redmi 12", "POCO M5"] },
  { brand: "Apple", models: ["iPhone 11", "iPhone 12", "iPhone 13", "iPhone XR"] },
  { brand: "OPPO", models: ["A16", "A57", "Reno 7", "Find X5"] },
  { brand: "vivo", models: ["Y21", "Y27", "V25", "V29"] },
];

async function ensureCredentialUser(input: { name: string; email: string; role: UserRole }) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name, role: input.role, emailVerified: true },
    create: {
      id: nanoid(),
      name: input.name,
      email: input.email,
      role: input.role,
      emailVerified: true,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
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

  if (user.role === "admin") {
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { plan: "enterprise", status: "active" },
      create: { userId: user.id, plan: "enterprise", status: "active" },
    });
  }

  return user;
}

async function ensureDemoStore(adminId: string) {
  const existing = await prisma.store.findFirst({
    where: { name: DEMO_TOKO_NAME },
    select: { id: true, name: true },
  });
  const store = existing
    ? await prisma.store.update({
        where: { id: existing.id },
        data: { address: "Jl. Demo Seed No. 1", phone: "081234567890", status: "active" },
        select: { id: true, name: true },
      })
    : await prisma.store.create({
        data: {
          name: DEMO_TOKO_NAME,
          address: "Jl. Demo Seed No. 1",
          phone: "081234567890",
          status: "active",
        },
        select: { id: true, name: true },
      });

  await prisma.userStore.upsert({
    where: { userId_storeId: { userId: adminId, storeId: store.id } },
    update: { role: "owner" },
    create: { userId: adminId, storeId: store.id, role: "owner" },
  });

  return store;
}

async function ensureUserStore(userId: string, storeId: string) {
  await prisma.userStore.upsert({
    where: { userId_storeId: { userId, storeId } },
    update: { role: "owner" },
    create: { userId, storeId, role: "owner" },
  });
}

async function ensureHpCatalog() {
  const deviceModelIds: string[] = [];

  for (const entry of demoCatalog) {
    const brand = await prisma.deviceBrand.upsert({
      where: { name: entry.brand },
      update: {},
      create: { name: entry.brand },
      select: { id: true },
    });

    for (const modelName of entry.models) {
      const hp = await prisma.deviceModel.upsert({
        where: { brandId_modelName: { brandId: brand.id, modelName } },
        update: {},
        create: { brandId: brand.id, modelName },
        select: { id: true },
      });
      deviceModelIds.push(hp.id);
    }
  }

  return deviceModelIds;
}

function randomServiceStatus(index: number) {
  if (index % 10 === 0) return "failed" as const;
  if (index % 3 === 0) return "done" as const;
  if (index % 3 === 1) return "repairing" as const;
  return "received" as const;
}

function chance(probability: number) {
  return faker.number.float({ min: 0, max: 1 }) < probability;
}

async function seedServices(input: {
  storeId: string;
  adminId: string;
  staffId: string;
  technicianId: string;
  deviceModelIds: string[];
}) {
  const existingCount = await prisma.repairOrder.count({ where: { storeId: input.storeId } });
  const remaining = Math.max(TARGET_SERVICE_COUNT - existingCount, 0);

  if (remaining === 0) return { created: 0, total: existingCount };

  const now = new Date();
  const services: Prisma.RepairOrderCreateManyInput[] = [];

  for (let index = 0; index < remaining; index += 1) {
    const absoluteIndex = existingCount + index;
    const status = randomServiceStatus(absoluteIndex);
    const checkinAt = faker.date.between({
      from: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      to: now,
    });
    const assignedAt = status === "received"
      ? null
      : new Date(checkinAt.getTime() + faker.number.int({ min: 1, max: 48 }) * 60 * 60 * 1000);
    const doneAt = status === "done" || status === "failed"
      ? new Date(checkinAt.getTime() + faker.number.int({ min: 1, max: 10 }) * 24 * 60 * 60 * 1000)
      : null;

    services.push({
      storeId: input.storeId,
      deviceModelId: faker.helpers.arrayElement(input.deviceModelIds),
      createdById: absoluteIndex % 4 === 0 ? input.adminId : input.staffId,
      technicianId: status === "received" ? null : input.technicianId,
      imei: faker.string.numeric(15),
      customerName: faker.person.fullName(),
      noWa: `08${faker.string.numeric(10)}`,
      complaint: faker.helpers.arrayElement([
        "LCD pecah",
        "Baterai cepat habis",
        "Tidak bisa charge",
        "Speaker mati",
        "Kamera buram",
        "Bootloop",
        "Sinyal hilang",
      ]),
      handlingNote: status === "received" ? null : faker.lorem.sentence(),
      includedItems: faker.helpers.arrayElement([["unit"], ["unit", "charger"], ["unit", "case"]]),
      passwordPattern: chance(0.3) ? "0,1,2,4" : null,
      note: chance(0.35) ? faker.lorem.sentence() : null,
      status,
      isPickedUp: status === "done" ? chance(0.55) : false,
      checkinAt,
      assignedAt,
      doneAt,
      warrantyUntil: status === "done" && doneAt
        ? new Date(doneAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        : null,
      checkoutAt: status === "done" && doneAt && chance(0.55)
        ? new Date(doneAt.getTime() + faker.number.int({ min: 1, max: 72 }) * 60 * 60 * 1000)
        : null,
      doneNotifiedAt: status === "done" && doneAt ? doneAt : null,
    });
  }

  for (let index = 0; index < services.length; index += 100) {
    await prisma.repairOrder.createMany({ data: services.slice(index, index + 100) });
  }

  return { created: remaining, total: existingCount + remaining };
}

async function writeLoginMarkdown(input: {
  store: { id: string; name: string };
  users: Array<{ name: string; email: string; role: string }>;
  services: { created: number; total: number };
}) {
  const outputPath = path.join(process.cwd(), "dev-doc", "demo-service-seed-logins.md");
  const lines = [
    "# Demo Service Seed Logins",
    "",
    "Generated by `prisma/seed-demo-services.ts`.",
    "",
    "Run with:",
    "",
    "```bash",
    "bun run seed:demo-services",
    "```",
    "",
    "This seed is non-destructive. It creates or reuses the demo toko and users, then adds services until the demo toko reaches `DEMO_SERVICE_COUNT` records. Default target is `1000`.",
    "",
    "Optional overrides:",
    "",
    "```bash",
    "DEMO_SERVICE_COUNT=2000 DEMO_SEED_PASSWORD=test1234 bun run seed:demo-services",
    "```",
    "",
  `Toko: ${input.store.name}`,
  `Toko ID: ${input.store.id}`,
    `Services created this run: ${input.services.created}`,
    `Services total in toko: ${input.services.total}`,
    "",
    "| Name | Email | Role | Password |",
    "| --- | --- | --- | --- |",
    ...input.users.map((user) => `| ${user.name} | ${user.email} | ${user.role} | ${DEMO_PASSWORD} |`),
    "",
  ];

  await writeFile(outputPath, lines.join("\n"), "utf8");
  return outputPath;
}

async function main() {
  faker.seed(20260513);
  console.log("Starting non-destructive demo service seed");

  const [admin, staff, technician] = await Promise.all(demoUsers.map((user) => ensureCredentialUser(user)));
  const store = await ensureDemoStore(admin.id);
  await Promise.all([ensureUserStore(staff.id, store.id), ensureUserStore(technician.id, store.id)]);

  const deviceModelIds = await ensureHpCatalog();
  const services = await seedServices({
    storeId: store.id,
    adminId: admin.id,
    staffId: staff.id,
    technicianId: technician.id,
    deviceModelIds,
  });
  const loginDocPath = await writeLoginMarkdown({ store, users: [admin, staff, technician], services });

  console.log("Demo service seed complete");
  console.log(`Toko: ${store.name} (${store.id})`);
  console.log(`Services created: ${services.created}`);
  console.log(`Services total: ${services.total}`);
  console.log(`Password for all demo users: ${DEMO_PASSWORD}`);
  console.log(`Login doc: ${loginDocPath}`);
}

main()
  .catch((error) => {
    console.error("Demo service seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
