import "dotenv/config";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { faker } from "@faker-js/faker";
import { hashPassword } from "@better-auth/utils/password";
import { PrismaPg } from "@prisma/adapter-pg";
import { nanoid } from "nanoid";
import { PrismaClient, Prisma } from "./generated/prisma/client";
import type {
  ActivityType,
  ItemType,
  PaymentStatus,
  ServiceStatus,
  SubscriptionPlan,
  TokoStatus,
  UserRole,
} from "./generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run seed");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "test1234";
const seedSize = (process.env.SEED_SIZE || "medium") as "small" | "medium" | "large";

const seedProfiles = {
  small: {
    tokoCount: 2,
    staffPerToko: 2,
    technicianPerToko: 3,
    sparepartsPerToko: 36,
    pricelistsPerToko: 12,
    servicesPerToko: 180,
  },
  medium: {
    tokoCount: 3,
    staffPerToko: 3,
    technicianPerToko: 4,
    sparepartsPerToko: 60,
    pricelistsPerToko: 18,
    servicesPerToko: 320,
  },
  large: {
    tokoCount: 5,
    staffPerToko: 4,
    technicianPerToko: 6,
    sparepartsPerToko: 90,
    pricelistsPerToko: 24,
    servicesPerToko: 520,
  },
} as const;

const config = seedProfiles[seedSize];

const tokoNames = [
  "RMS Alpha Cell",
  "RMS Beta Phonecare",
  "RMS Gamma Gadget",
  "RMS Delta Mobile",
  "RMS Omega Repair",
  "RMS Pixel Works",
];

const brandCatalog = [
  { brand: "Samsung", models: ["Galaxy A12", "Galaxy A15", "Galaxy A24", "Galaxy S21", "Galaxy M14"] },
  { brand: "Xiaomi", models: ["Redmi Note 10", "Redmi Note 12", "POCO X3", "POCO M5", "Redmi 12"] },
  { brand: "Apple", models: ["iPhone 11", "iPhone 12", "iPhone 13", "iPhone XR", "iPhone SE"] },
  { brand: "OPPO", models: ["A15", "A16", "Reno 7", "A57", "Find X5"] },
  { brand: "vivo", models: ["Y12", "Y21", "V25", "Y27", "V29"] },
  { brand: "realme", models: ["C11", "C35", "Narzo 50", "9 Pro", "GT Neo"] },
  { brand: "Infinix", models: ["Hot 10", "Hot 12", "Note 30", "Zero 5G", "Smart 7"] },
  { brand: "TECNO", models: ["Spark 10", "Pova 5", "Camon 20", "Pop 7", "Pova Neo"] },
  { brand: "Huawei", models: ["Nova 7", "P30", "Y9a", "Mate 20", "Nova Y70"] },
  { brand: "ASUS", models: ["Zenfone 8", "Zenfone 9", "ROG Phone 5", "ROG Phone 6", "Zenfone Max"] },
];

const sparepartPrefixes = [
  "LCD",
  "Baterai",
  "Speaker",
  "Mic",
  "Port Charger",
  "Backdoor",
  "Kamera",
  "Flexibel Power",
  "IC Charger",
  "Touchscreen",
  "Mesin",
  "Connector",
];

const serviceTitles = [
  "Jasa Ganti LCD",
  "Jasa Ganti Baterai",
  "Jasa Servis Port Charger",
  "Jasa Flash Ulang",
  "Jasa Reball IC",
  "Jasa Pembersihan Mesin",
  "Jasa Penggantian Backdoor",
  "Jasa Perbaikan Speaker",
  "Jasa Perbaikan Kamera",
  "Jasa Unlock Pola",
  "Jasa Bongkar Pasang",
  "Jasa Perbaikan Sinyal",
  "Jasa Servis Mati Total",
  "Jasa Rework Jalur",
  "Jasa Perbaikan Tombol Power",
  "Jasa Perbaikan Face ID/Fingerprint",
  "Jasa Kalibrasi",
  "Jasa Water Damage Treatment",
  "Jasa Penggantian IC Audio",
  "Jasa Penggantian Frame",
];

const complaintCatalog = [
  "LCD pecah dan layar blank",
  "Baterai cepat habis dan panas",
  "Tidak bisa charging",
  "Bootloop setelah update",
  "Speaker tidak berbunyi",
  "Mic tidak menangkap suara",
  "Kamera blur dan force close",
  "Sinyal hilang total",
  "Lupa pola layar",
  "Tombol power macet",
  "Touchscreen ghost touch",
  "Mati total setelah jatuh",
  "Kena air dan tidak mau hidup",
  "Suara kecil sebelah",
  "Fingerprint tidak berfungsi",
  "Restart sendiri terus",
  "Aplikasi sering force close",
  "WiFi tidak bisa aktif",
  "Bluetooth tidak terdeteksi",
  "Kamera depan gelap",
];

const successNotes = [
  "{BERHASIL} Unit normal kembali setelah penggantian komponen.",
  "{BERHASIL} Jalur berhasil diperbaiki dan pengujian lolos.",
  "{BERHASIL} Software di-flash ulang dan stabil.",
  "{BERHASIL} Semua fungsi utama berjalan normal.",
];

const failedNotes = [
  "{GAGAL} Mesin korosi parah dan tidak ekonomis diperbaiki.",
  "{GAGAL} IC utama rusak dan part pengganti tidak tersedia.",
  "{GAGAL} Kerusakan berlapis, customer belum setuju estimasi lanjutan.",
  "{GAGAL} Unit hidup sesaat lalu short kembali setelah observasi.",
];

type SeedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tokoId: string;
  tokoName: string;
};

type CatalogRef = {
  id: string;
  brandName: string;
  modelName: string;
};

type SparepartRef = {
  id: string;
  name: string;
  defaultPrice: number;
  tokoId: string;
  isUniversal: boolean;
};

type PricelistRef = {
  id: string;
  title: string;
  defaultPrice: number;
  tokoId: string;
};

type ServiceSeedRow = {
  id: string;
  tokoId: string;
  hpCatalogId: string;
  createdById: string;
  technicianId: string | null;
  imei: string | null;
  customerName: string;
  noWa: string;
  complaint: string;
  passwordPattern: string | null;
  note: string | null;
  status: ServiceStatus;
  isPickedUp: boolean;
  checkinAt: Date;
  assignedAt: Date | null;
  doneAt: Date | null;
  checkoutAt: Date | null;
  doneNotifiedAt: Date | null;
};

type ServiceItemSeedRow = {
  id: string;
  serviceId: string;
  type: ItemType;
  referenceId: string | null;
  name: string;
  qty: number;
  price: number;
};

type InvoiceSeedRow = {
  id: string;
  serviceId: string;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  paidAt: Date | null;
  createdAt: Date;
};

type ActivitySeedRow = {
  id: string;
  tokoId: string;
  serviceId: string | null;
  userId: string;
  type: ActivityType;
  title: string;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
};

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function makePhoneNumber() {
  return `08${faker.string.numeric(10)}`;
}

function maybePasswordPattern() {
  if (!faker.datatype.boolean(0.3)) return null;
  const points = faker.helpers.arrayElements([1, 2, 3, 4, 5, 6, 7, 8, 9], faker.number.int({ min: 4, max: 6 }));
  return points.join("-");
}

function randomCheckinDate() {
  return faker.date.between({ from: faker.date.recent({ days: 120 }), to: new Date() });
}

function shiftMinutes(date: Date, minMinutes: number, maxMinutes: number) {
  return new Date(date.getTime() + faker.number.int({ min: minMinutes, max: maxMinutes }) * 60_000);
}

function chooseLifecycle() {
  const roll = faker.number.int({ min: 1, max: 100 });
  if (roll <= 18) return { status: "received" as ServiceStatus, isPickedUp: false };
  if (roll <= 42) return { status: "repairing" as ServiceStatus, isPickedUp: false };
  if (roll <= 62) return { status: "done" as ServiceStatus, isPickedUp: false };
  if (roll <= 74) return { status: "failed" as ServiceStatus, isPickedUp: false };
  if (roll <= 94) return { status: "done" as ServiceStatus, isPickedUp: true };
  return { status: "failed" as ServiceStatus, isPickedUp: true };
}

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function insertManyInChunks<T>(
  items: T[],
  inserter: (batch: T[]) => Promise<unknown>,
  size: number = 250,
) {
  for (const batch of chunk(items, size)) {
    await inserter(batch);
  }
}

async function resetDatabase() {
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.deleteMany();
    await tx.invoice.deleteMany();
    await tx.serviceItem.deleteMany();
    await tx.service.deleteMany();
    await tx.sparepartCompatibility.deleteMany();
    await tx.sparepart.deleteMany();
    await tx.servicePricelist.deleteMany();
    await tx.hpCatalog.deleteMany();
    await tx.brand.deleteMany();
    await tx.userToko.deleteMany();
    await tx.subscription.deleteMany();
    await tx.verification.deleteMany();
    await tx.session.deleteMany();
    await tx.account.deleteMany();
    await tx.user.deleteMany();
    await tx.toko.deleteMany();
  }, { timeout: 120_000 });
}

async function seedUsers(tokos: Array<{ id: string; name: string }>) {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const users: SeedUser[] = [];
  const userRows: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    emailVerified: boolean;
  }> = [];
  const accountRows: Array<{
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    password: string;
  }> = [];
  const assignmentRows: Array<{ userId: string; tokoId: string; role: "owner" }> = [];
  const subscriptionRows: Array<{ id: string; userId: string; plan: SubscriptionPlan }> = [];

  for (const toko of tokos) {
    const tokoSlug = slugify(toko.name);
    const adminId = nanoid();
    const adminEmail = `admin.${tokoSlug}@seed.local`;
    const adminName = `Admin ${toko.name.replace(/^RMS\s+/, "")}`;
    users.push({ id: adminId, name: adminName, email: adminEmail, role: "admin", tokoId: toko.id, tokoName: toko.name });

    userRows.push({ id: adminId, name: adminName, email: adminEmail, role: "admin", emailVerified: true });
    accountRows.push({ id: nanoid(), accountId: adminId, providerId: "credential", userId: adminId, password: passwordHash });
    assignmentRows.push({ userId: adminId, tokoId: toko.id, role: "owner" });
    subscriptionRows.push({ id: faker.string.uuid(), userId: adminId, plan: "premium" });

    for (let index = 1; index <= config.staffPerToko; index += 1) {
      const id = nanoid();
      const email = `staff${index}.${tokoSlug}@seed.local`;
      const name = `${faker.person.firstName()} Staff ${index}`;
      users.push({ id, name, email, role: "staff", tokoId: toko.id, tokoName: toko.name });
      userRows.push({ id, name, email, role: "staff", emailVerified: true });
      accountRows.push({ id: nanoid(), accountId: id, providerId: "credential", userId: id, password: passwordHash });
      assignmentRows.push({ userId: id, tokoId: toko.id, role: "owner" });
      subscriptionRows.push({ id: faker.string.uuid(), userId: id, plan: "free" });
    }

    for (let index = 1; index <= config.technicianPerToko; index += 1) {
      const id = nanoid();
      const email = `tech${index}.${tokoSlug}@seed.local`;
      const name = `${faker.person.firstName()} Teknisi ${index}`;
      users.push({ id, name, email, role: "technician", tokoId: toko.id, tokoName: toko.name });
      userRows.push({ id, name, email, role: "technician", emailVerified: true });
      accountRows.push({ id: nanoid(), accountId: id, providerId: "credential", userId: id, password: passwordHash });
      assignmentRows.push({ userId: id, tokoId: toko.id, role: "owner" });
      subscriptionRows.push({ id: faker.string.uuid(), userId: id, plan: "free" });
    }
  }

  await prisma.user.createMany({ data: userRows });
  await prisma.account.createMany({ data: accountRows });
  await prisma.userToko.createMany({ data: assignmentRows });
  await prisma.subscription.createMany({ data: subscriptionRows });

  return users;
}

async function seedCatalogs() {
  const brandRows = brandCatalog.map((entry) => ({
    id: faker.string.uuid(),
    name: entry.brand,
  }));

  await prisma.brand.createMany({ data: brandRows });

  const brandIdByName = new Map(brandRows.map((row) => [row.name, row.id]));

  const hpCatalogRows = brandCatalog.flatMap((entry) =>
    entry.models.map((modelName) => ({
      id: faker.string.uuid(),
      brandId: brandIdByName.get(entry.brand)!,
      modelName,
      modelNumber: `${entry.brand.slice(0, 3).toUpperCase()}-${faker.string.alphanumeric({ length: 4, casing: "upper" })}`,
    })),
  );

  await prisma.hpCatalog.createMany({ data: hpCatalogRows });

  return hpCatalogRows.map((row) => ({
    id: row.id,
    brandName: brandCatalog.find((entry) => brandIdByName.get(entry.brand) === row.brandId)?.brand ?? "Unknown",
    modelName: row.modelName,
  })) satisfies CatalogRef[];
}

async function seedInventory(tokos: Array<{ id: string; name: string }>, catalogs: CatalogRef[]) {
  const sparepartRows: Array<{
    id: string;
    name: string;
    defaultPrice: number;
    stock: number;
    isUniversal: boolean;
    tokoId: string;
  }> = [];
  const compatibilityRows: Array<{ hpCatalogId: string; sparepartId: string }> = [];
  const pricelistRows: Array<{ id: string; title: string; defaultPrice: number; tokoId: string }> = [];

  for (const toko of tokos) {
    for (let index = 0; index < config.sparepartsPerToko; index += 1) {
      const prefix = sparepartPrefixes[index % sparepartPrefixes.length];
      const refCatalog = catalogs[index % catalogs.length];
      const isUniversal = index % 4 === 0;
      const name = isUniversal
        ? `${prefix} Universal ${index + 1}`
        : `${prefix} ${refCatalog.brandName} ${refCatalog.modelName}`;
      const sparepartId = faker.string.uuid();
      sparepartRows.push({
        id: sparepartId,
        name,
        defaultPrice: faker.number.int({ min: 35_000, max: 550_000 }),
        stock: faker.number.int({ min: 2, max: 40 }),
        isUniversal,
        tokoId: toko.id,
      });

      if (!isUniversal) {
        for (const catalog of faker.helpers.arrayElements(catalogs, faker.number.int({ min: 1, max: 4 }))) {
          compatibilityRows.push({ hpCatalogId: catalog.id, sparepartId });
        }
      }
    }

    for (let index = 0; index < config.pricelistsPerToko; index += 1) {
      const title = `${serviceTitles[index % serviceTitles.length]} ${index >= serviceTitles.length ? index + 1 : ""}`.trim();
      pricelistRows.push({
        id: faker.string.uuid(),
        title,
        defaultPrice: faker.number.int({ min: 40_000, max: 450_000 }),
        tokoId: toko.id,
      });
    }
  }

  await prisma.sparepart.createMany({ data: sparepartRows });
  await insertManyInChunks(compatibilityRows, (batch) => prisma.sparepartCompatibility.createMany({ data: batch }), 400);
  await prisma.servicePricelist.createMany({ data: pricelistRows });

  return {
    spareparts: sparepartRows satisfies SparepartRef[],
    pricelists: pricelistRows satisfies PricelistRef[],
  };
}

function createServiceItems(
  serviceId: string,
  status: ServiceStatus,
  spareparts: SparepartRef[],
  pricelists: PricelistRef[],
) {
  const rows: ServiceItemSeedRow[] = [];
  const itemCount = status === "received"
    ? faker.number.int({ min: 0, max: 1 })
    : status === "repairing"
      ? faker.number.int({ min: 1, max: 3 })
      : faker.number.int({ min: 1, max: 4 });

  for (let index = 0; index < itemCount; index += 1) {
    const useSparepart = index === 0 || faker.datatype.boolean(0.45);
    if (useSparepart && spareparts.length > 0) {
      const part = faker.helpers.arrayElement(spareparts);
      rows.push({
        id: faker.string.uuid(),
        serviceId,
        type: "sparepart",
        referenceId: part.id,
        name: part.name,
        qty: 1,
        price: part.defaultPrice,
      });
    } else {
      const service = faker.helpers.arrayElement(pricelists);
      rows.push({
        id: faker.string.uuid(),
        serviceId,
        type: "service",
        referenceId: null,
        name: service.title,
        qty: 1,
        price: service.defaultPrice,
      });
    }
  }

  return rows;
}

async function seedServices(
  tokos: Array<{ id: string; name: string }>,
  users: SeedUser[],
  catalogs: CatalogRef[],
  spareparts: SparepartRef[],
  pricelists: PricelistRef[],
) {
  const services: ServiceSeedRow[] = [];
  const serviceItems: ServiceItemSeedRow[] = [];
  const invoices: InvoiceSeedRow[] = [];
  const activities: ActivitySeedRow[] = [];

  for (const toko of tokos) {
    const tokoUsers = users.filter((user) => user.tokoId === toko.id);
    const creators = tokoUsers.filter((user) => user.role === "admin" || user.role === "staff");
    const technicians = tokoUsers.filter((user) => user.role === "technician");
    const tokoSpareparts = spareparts.filter((part) => part.tokoId === toko.id);
    const tokoPricelists = pricelists.filter((item) => item.tokoId === toko.id);

    for (let index = 0; index < config.servicesPerToko; index += 1) {
      const lifecycle = chooseLifecycle();
      const creator = faker.helpers.arrayElement(creators);
      const technician = lifecycle.status === "received" && faker.datatype.boolean(0.5)
        ? null
        : faker.helpers.arrayElement(technicians);
      const catalog = faker.helpers.arrayElement(catalogs);
      const checkinAt = randomCheckinDate();
      const assignedAt = technician ? shiftMinutes(checkinAt, 30, 2_880) : null;
      const doneAt = lifecycle.status === "done" || lifecycle.status === "failed"
        ? shiftMinutes(assignedAt ?? checkinAt, 120, 8_640)
        : null;
      const checkoutAt = lifecycle.isPickedUp && doneAt
        ? shiftMinutes(doneAt, 60, 4_320)
        : null;
      const serviceId = faker.string.uuid();
      const complaint = faker.helpers.arrayElement(complaintCatalog);
      const note = lifecycle.status === "done"
        ? faker.helpers.arrayElement(successNotes)
        : lifecycle.status === "failed"
          ? faker.helpers.arrayElement(failedNotes)
          : faker.datatype.boolean(0.35)
            ? faker.lorem.sentence()
            : null;

      services.push({
        id: serviceId,
        tokoId: toko.id,
        hpCatalogId: catalog.id,
        createdById: creator.id,
        technicianId: technician?.id ?? null,
        imei: faker.datatype.boolean(0.7) ? faker.string.numeric(15) : null,
        customerName: faker.person.fullName(),
        noWa: makePhoneNumber(),
        complaint,
        passwordPattern: maybePasswordPattern(),
        note,
        status: lifecycle.status,
        isPickedUp: lifecycle.isPickedUp,
        checkinAt,
        assignedAt,
        doneAt,
        checkoutAt,
        doneNotifiedAt: doneAt && faker.datatype.boolean(0.6) ? shiftMinutes(doneAt, 10, 240) : null,
      });

      activities.push({
        id: faker.string.uuid(),
        tokoId: toko.id,
        serviceId,
        userId: creator.id,
        type: "service_created",
        title: "Service created",
        payload: {
          status: "received",
          technicianId: technician?.id ?? null,
        },
        createdAt: checkinAt,
      });

      if (assignedAt && technician) {
        activities.push({
          id: faker.string.uuid(),
          tokoId: toko.id,
          serviceId,
          userId: creator.id,
          type: "service_assigned",
          title: "Technician assigned to service",
          payload: {
            previousTechnicianId: null,
            technicianId: technician.id,
            previousStatus: "received",
            nextStatus: lifecycle.status === "received" ? "received" : "repairing",
            assignedAt: assignedAt.toISOString(),
          },
          createdAt: assignedAt,
        });
      }

      const rows = createServiceItems(serviceId, lifecycle.status, tokoSpareparts, tokoPricelists);
      serviceItems.push(...rows);

      if (doneAt) {
        activities.push({
          id: faker.string.uuid(),
          tokoId: toko.id,
          serviceId,
          userId: technician?.id ?? creator.id,
          type: "service_status_changed",
          title: lifecycle.status === "done" ? "Service marked as done" : "Service marked as failed",
          payload: {
            previousStatus: assignedAt ? "repairing" : "received",
            nextStatus: lifecycle.status,
            note,
          },
          createdAt: doneAt,
        });
      }

      if (rows.length > 0 && lifecycle.status !== "received") {
        const invoiceCreatedAt = shiftMinutes(assignedAt ?? checkinAt, 15, 180);
        const grandTotal = rows.reduce((sum, item) => sum + item.price, 0);
        const paymentStatus: PaymentStatus = lifecycle.isPickedUp || lifecycle.status === "done"
          ? faker.helpers.arrayElement(["paid", "unpaid", "paid"])
          : faker.helpers.arrayElement(["unpaid", "unpaid", "paid"]);
        const paidAt = paymentStatus === "paid"
          ? shiftMinutes(doneAt ?? invoiceCreatedAt, 30, lifecycle.isPickedUp ? 1_440 : 4_320)
          : null;

        invoices.push({
          id: faker.string.uuid(),
          serviceId,
          grandTotal,
          paymentStatus,
          paidAt,
          createdAt: invoiceCreatedAt,
        });

        activities.push({
          id: faker.string.uuid(),
          tokoId: toko.id,
          serviceId,
          userId: creator.id,
          type: "invoice_created",
          title: "Invoice created",
          payload: {
            grandTotal,
          },
          createdAt: invoiceCreatedAt,
        });

        if (paidAt) {
          activities.push({
            id: faker.string.uuid(),
            tokoId: toko.id,
            serviceId,
            userId: creator.id,
            type: "invoice_paid",
            title: "Invoice marked as paid",
            payload: {
              paidAt: paidAt.toISOString(),
            },
            createdAt: paidAt,
          });
        }
      }

      if (checkoutAt) {
        activities.push({
          id: faker.string.uuid(),
          tokoId: toko.id,
          serviceId,
          userId: creator.id,
          type: "service_status_changed",
          title: "Service marked as picked up",
          payload: {
            previousStatus: lifecycle.status,
            nextStatus: lifecycle.status,
            isPickedUp: true,
            checkoutAt: checkoutAt.toISOString(),
          },
          createdAt: checkoutAt,
        });
      }
    }
  }

  await insertManyInChunks(services, (batch) => prisma.service.createMany({ data: batch }), 250);
  await insertManyInChunks(serviceItems, (batch) => prisma.serviceItem.createMany({ data: batch }), 400);
  await insertManyInChunks(invoices, (batch) => prisma.invoice.createMany({ data: batch }), 250);
  await insertManyInChunks(activities, (batch) => prisma.activityLog.createMany({ data: batch as Prisma.ActivityLogCreateManyInput[] }), 500);

  return {
    services,
    serviceItems,
    invoices,
    activities,
  };
}

async function writeLoginMarkdown(tokos: Array<{ id: string; name: string }>, users: SeedUser[]) {
  const sections = [
    "# Dev Seed Logins",
    "",
    `Generated by \`prisma/seed.ts\` using profile \`${seedSize}\`.`,
    "",
    `Default password for all seeded users: \`${DEFAULT_PASSWORD}\``,
    "",
  ];

  for (const toko of tokos) {
    sections.push(`## Toko: ${toko.name}`, "");

    for (const role of ["admin", "staff", "technician"] as const) {
      const roleUsers = users
        .filter((user) => user.tokoId === toko.id && user.role === role)
        .sort((left, right) => left.email.localeCompare(right.email));

      if (roleUsers.length === 0) continue;

      sections.push(`### ${role === "admin" ? "Admin" : role === "staff" ? "Staff" : "Technician"}`);
      sections.push("", "| Name | Email | Password |", "| --- | --- | --- |");

      for (const user of roleUsers) {
        sections.push(`| ${user.name} | ${user.email} | ${DEFAULT_PASSWORD} |`);
      }

      sections.push("");
    }
  }

  const outputPath = path.join(process.cwd(), "dev-doc", "dev-seed-logins.md");
  await writeFile(outputPath, `${sections.join("\n")}\n`, "utf8");

  return outputPath;
}

async function main() {
  faker.seed(20260422);

  console.log(`Starting seed with profile: ${seedSize}`);
  await resetDatabase();

  const tokos = tokoNames.slice(0, config.tokoCount).map((name) => ({
    id: faker.string.uuid(),
    name,
    address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
    phone: makePhoneNumber(),
    status: "active" as TokoStatus,
    logoUrl: null,
  }));

  await prisma.toko.createMany({ data: tokos });

  const users = await seedUsers(tokos.map(({ id, name }) => ({ id, name })));
  const catalogs = await seedCatalogs();
  const { spareparts, pricelists } = await seedInventory(tokos.map(({ id, name }) => ({ id, name })), catalogs);
  const seeded = await seedServices(tokos.map(({ id, name }) => ({ id, name })), users, catalogs, spareparts, pricelists);
  const loginDocPath = await writeLoginMarkdown(tokos.map(({ id, name }) => ({ id, name })), users);

  console.log("Seed complete");
  console.log(`Tokos: ${tokos.length}`);
  console.log(`Users: ${users.length}`);
  console.log(`Catalogs: ${catalogs.length}`);
  console.log(`Spareparts: ${spareparts.length}`);
  console.log(`Pricelists: ${pricelists.length}`);
  console.log(`Services: ${seeded.services.length}`);
  console.log(`Service items: ${seeded.serviceItems.length}`);
  console.log(`Invoices: ${seeded.invoices.length}`);
  console.log(`Activities: ${seeded.activities.length}`);
  console.log(`Login doc: ${loginDocPath}`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
