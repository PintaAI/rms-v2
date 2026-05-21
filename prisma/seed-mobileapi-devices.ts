import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed MobileAPI devices");
}

const apiKey = process.env.MOBILEAPI_API_KEY?.trim();

if (!apiKey) {
  throw new Error("MOBILEAPI_API_KEY is required to seed MobileAPI devices");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const API_BASE_URL = "https://api.mobileapi.dev";
const CHECKPOINT_PATH = path.join(process.cwd(), "dev-doc", "mobileapi-device-seed-checkpoint.json");
const MAX_REQUESTS = getPositiveInteger("MOBILEAPI_SEED_MAX_REQUESTS", 45);
const REQUEST_DELAY_MS = getPositiveInteger("MOBILEAPI_SEED_DELAY_MS", 13_000);
const APPLE_MAX_PAGES = getPositiveInteger("MOBILEAPI_APPLE_MAX_PAGES", 4);
const YEAR_MAX_PAGES = getPositiveInteger("MOBILEAPI_YEAR_MAX_PAGES", 10);
const TARGET_YEARS = parseNumberCsv(process.env.MOBILEAPI_SEED_YEARS) ?? [2026, 2025, 2024, 2023];
const TARGET_BRANDS = new Set(
  parseStringCsv(process.env.MOBILEAPI_SEED_BRANDS) ?? [
    "Apple",
    "Samsung",
    "Xiaomi",
    "OPPO",
    "vivo",
    "realme",
    "Infinix",
    "TECNO",
    "Huawei",
    "ASUS",
  ]
);
const SKIP_APPLE = process.env.MOBILEAPI_SEED_SKIP_APPLE === "1";
const REQUIRED_IPHONE_FAMILY_QUERIES = [
  "iPhone 6",
  "iPhone 6s",
  "iPhone SE",
  "iPhone 7",
  "iPhone 8",
  "iPhone X",
  "iPhone XR",
  "iPhone XS",
  "iPhone 11",
  "iPhone 12",
  "iPhone 13",
  "iPhone 14",
  "iPhone 15",
  "iPhone 16",
  "iPhone 17",
];

interface MobileApiDevice {
  id: string;
  name: string;
  brandName: string;
  modelNumber: string | null;
  deviceType: string | null;
  imageB64: string | null;
  description: string | null;
  colors: string | null;
  storage: string | null;
  screenResolution: string | null;
  weight: string | null;
  thickness: string | null;
  releaseDate: string | null;
  camera: string | null;
  batteryCapacity: string | null;
  hardware: string | null;
}

interface MobileApiListPayload {
  total?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  has_next?: boolean;
  devices?: unknown[];
  skipped?: boolean;
}

interface SeedCheckpoint {
  fetched: string[];
  updatedAt?: string;
}

let successfulRequestCount = 0;
let rateLimitCount = 0;
let lastRequestAt = 0;
let skippedCheckpointCount = 0;
let checkpoint = new Set<string>();

function getPositiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function parseStringCsv(value: string | undefined) {
  if (!value?.trim()) return null;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberCsv(value: string | undefined) {
  const items = parseStringCsv(value);
  if (!items) return null;
  return items
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getBrandName(record: Record<string, unknown>) {
  const directBrand = asString(record.manufacturer_name) ?? asString(record.brand_name);
  if (directBrand) return directBrand;

  const manufacturer = record.manufacturer;
  if (manufacturer && typeof manufacturer === "object") {
    const name = asString((manufacturer as Record<string, unknown>).name);
    if (name) return name;
  }

  const brand = record.brand;
  if (brand && typeof brand === "object") {
    const name = asString((brand as Record<string, unknown>).name);
    if (name) return name;
  }

  return null;
}

function stripBrandPrefix(name: string, brandName: string) {
  return name.toLowerCase().startsWith(`${brandName.toLowerCase()} `)
    ? name.slice(brandName.length).trim()
    : name;
}

function normalizeDevice(value: unknown): MobileApiDevice | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const id = record.id;
  const name = asString(record.name);
  const brandName = getBrandName(record);

  if ((typeof id !== "string" && typeof id !== "number") || !name || !brandName) {
    return null;
  }

  return {
    id: String(id),
    name: stripBrandPrefix(name, brandName),
    brandName,
    modelNumber: asString(record.model_numbers) ?? asString(record.model_number),
    deviceType: asString(record.device_type),
    imageB64: asString(record.image_b64) ?? asString(record.main_image_b64),
    description: asString(record.description),
    colors: asString(record.colors),
    storage: asString(record.storage),
    screenResolution: asString(record.screen_resolution),
    weight: asString(record.weight),
    thickness: asString(record.thickness),
    releaseDate: asString(record.release_date),
    camera: asString(record.camera),
    batteryCapacity: asString(record.battery_capacity),
    hardware: asString(record.hardware),
  };
}

function isPhone(device: MobileApiDevice) {
  return !device.deviceType || device.deviceType.toLowerCase() === "phone";
}

function isIphoneSixOrNewer(device: MobileApiDevice) {
  if (device.brandName.toLowerCase() !== "apple") return false;
  const modelName = device.name.trim();
  if (!/^iphone\b/i.test(modelName)) return false;

  const majorMatch = modelName.match(/^iphone\s+(\d+)/i);
  if (majorMatch) return Number(majorMatch[1]) >= 6;

  if (/^iphone\s+(x|xr|xs)\b/i.test(modelName)) return true;

  return /\bSE\b/i.test(modelName);
}

function getIphoneFamilyKey(device: MobileApiDevice) {
  if (!isIphoneSixOrNewer(device)) return null;
  const modelName = device.name.trim();
  if (/^iphone\s+6s\b/i.test(modelName)) return "iphone-6s";
  const majorMatch = modelName.match(/^iphone\s+(\d+)/i);
  if (majorMatch) return `iphone-${majorMatch[1]}`;
  const letterMatch = modelName.match(/^iphone\s+(x|xr|xs)\b/i);
  if (letterMatch) return `iphone-${letterMatch[1].toLowerCase()}`;
  if (/\bSE\b/i.test(modelName)) return "iphone-se";
  return null;
}

function getIphoneQueryFamilyKey(query: string) {
  return query.toLowerCase().replace(/\s+/g, "-");
}

function shouldSeedNewestDevice(device: MobileApiDevice) {
  return isPhone(device) && TARGET_BRANDS.has(device.brandName);
}

async function fetchMobileApi(path: string, params: Record<string, string | number>) {
  const checkpointKey = getCheckpointKey(path, params);
  if (checkpoint.has(checkpointKey)) {
    skippedCheckpointCount += 1;
    return { devices: [], has_next: true, skipped: true } satisfies MobileApiListPayload;
  }

  if (successfulRequestCount >= MAX_REQUESTS) {
    return { devices: [], has_next: false } satisfies MobileApiListPayload;
  }

  await waitForRateLimitSlot();

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  const response = await fetch(`${API_BASE_URL}${path}?${searchParams.toString()}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (response.status === 204) {
    successfulRequestCount += 1;
    await markCheckpointFetched(checkpointKey);
    return { devices: [], has_next: false } satisfies MobileApiListPayload;
  }

  if (response.status === 429) {
    rateLimitCount += 1;
    const retryAfter = await getRetryAfterMs(response);
    console.log(`Rate limited by MobileAPI. Waiting ${Math.ceil(retryAfter / 1000)}s before retrying...`);
    await sleep(retryAfter);
    return fetchMobileApi(path, params);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MobileAPI request failed (${response.status}) for ${path}: ${body}`);
  }

  successfulRequestCount += 1;
  const payload = await response.json() as MobileApiListPayload;
  await markCheckpointFetched(checkpointKey);
  return payload;
}

function getCheckpointKey(pathname: string, params: Record<string, string | number>) {
  const entries = Object.entries(params).sort(([left], [right]) => left.localeCompare(right));
  return `${pathname}?${entries.map(([key, value]) => `${key}=${value}`).join("&")}`;
}

async function loadCheckpoint() {
  try {
    const raw = await readFile(CHECKPOINT_PATH, "utf8");
    const parsed = JSON.parse(raw) as SeedCheckpoint;
    checkpoint = new Set(Array.isArray(parsed.fetched) ? parsed.fetched : []);
  } catch {
    checkpoint = new Set();
  }
}

async function markCheckpointFetched(key: string) {
  if (checkpoint.has(key)) return;
  checkpoint.add(key);
  await writeCheckpoint();
}

async function writeCheckpoint() {
  const payload: SeedCheckpoint = {
    fetched: [...checkpoint].sort(),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(CHECKPOINT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

async function waitForRateLimitSlot() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed > 0 && elapsed < REQUEST_DELAY_MS) {
    await sleep(REQUEST_DELAY_MS - elapsed);
  }
  lastRequestAt = Date.now();
}

async function getRetryAfterMs(response: Response) {
  const headerValue = response.headers.get("retry-after");
  const headerSeconds = headerValue ? Number(headerValue) : NaN;
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) return Math.ceil(headerSeconds * 1000) + 1000;

  try {
    const body = await response.json() as { retry_after?: unknown };
    const bodySeconds = Number(body.retry_after);
    if (Number.isFinite(bodySeconds) && bodySeconds > 0) return Math.ceil(bodySeconds * 1000) + 1000;
  } catch {
    return REQUEST_DELAY_MS;
  }

  return REQUEST_DELAY_MS;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertDevice(device: MobileApiDevice, importStrategy: string) {
  const brand = await prisma.brand.upsert({
    where: { name: device.brandName },
    update: {},
    create: { name: device.brandName },
    select: { id: true },
  });

  const metadata = {
    source: "mobileapi.dev",
    importStrategy,
    deviceType: device.deviceType,
    imageB64: device.imageB64,
    description: device.description,
    colors: device.colors,
    storage: device.storage,
    screenResolution: device.screenResolution,
    weight: device.weight,
    thickness: device.thickness,
    releaseDate: device.releaseDate,
    camera: device.camera,
    batteryCapacity: device.batteryCapacity,
    hardware: device.hardware,
  };

  const byMobileApiId = await prisma.hpCatalog.findUnique({
    where: { mobileApiId: device.id },
    select: { id: true },
  });

  if (byMobileApiId) {
    await prisma.hpCatalog.update({
      where: { id: byMobileApiId.id },
      data: {
        brandId: brand.id,
        modelName: device.name,
        modelNumber: device.modelNumber ?? undefined,
        metadata,
      },
    });
    return "updated" as const;
  }

  const existingByName = await prisma.hpCatalog.findFirst({
    where: { brandId: brand.id, modelName: device.name },
    select: { id: true },
  });

  if (existingByName) {
    await prisma.hpCatalog.update({
      where: { id: existingByName.id },
      data: {
        modelNumber: device.modelNumber ?? undefined,
        mobileApiId: device.id,
        metadata,
      },
    });
    return "updated" as const;
  }

  await prisma.hpCatalog.create({
    data: {
      brandId: brand.id,
      modelName: device.name,
      modelNumber: device.modelNumber,
      mobileApiId: device.id,
      metadata,
    },
  });

  return "created" as const;
}

async function seedAppleIphones() {
  let created = 0;
  let updated = 0;
  let seen = 0;
  const familyKeys = new Set<string>();

  for (let page = 1; page <= APPLE_MAX_PAGES; page += 1) {
    const payload = await fetchMobileApi("/devices/by-manufacturer/", { manufacturer: "Apple", page });
    const devices = (payload.devices ?? []).map(normalizeDevice).filter((device): device is MobileApiDevice => Boolean(device));

    for (const device of devices) {
      if (!isIphoneSixOrNewer(device)) continue;
      const familyKey = getIphoneFamilyKey(device);
      if (familyKey) familyKeys.add(familyKey);
      seen += 1;
      const result = await upsertDevice(device, "apple-iphone-6-plus");
      if (result === "created") created += 1;
      if (result === "updated") updated += 1;
    }

    if (payload.skipped) continue;
    if (!payload.has_next) break;
  }

  for (const query of REQUIRED_IPHONE_FAMILY_QUERIES) {
    if (successfulRequestCount >= MAX_REQUESTS) break;
    if (familyKeys.has(getIphoneQueryFamilyKey(query))) continue;

    const payload = await fetchMobileApi("/devices/search/", { name: query, manufacturer: "Apple", page: 1 });
    const devices = (payload.devices ?? []).map(normalizeDevice).filter((device): device is MobileApiDevice => Boolean(device));

    for (const device of devices) {
      if (!isIphoneSixOrNewer(device)) continue;
      const familyKey = getIphoneFamilyKey(device);
      if (familyKey) familyKeys.add(familyKey);
      seen += 1;
      const result = await upsertDevice(device, "apple-iphone-family-fallback");
      if (result === "created") created += 1;
      if (result === "updated") updated += 1;
    }
  }

  return { created, updated, seen };
}

async function seedNewestPhones() {
  let created = 0;
  let updated = 0;
  let seen = 0;

  for (const year of TARGET_YEARS) {
    for (let page = 1; page <= YEAR_MAX_PAGES; page += 1) {
      if (successfulRequestCount >= MAX_REQUESTS) return { created, updated, seen };

      const payload = await fetchMobileApi("/devices/by-year/", { year, page });
      const devices = (payload.devices ?? []).map(normalizeDevice).filter((device): device is MobileApiDevice => Boolean(device));

      for (const device of devices) {
        if (!shouldSeedNewestDevice(device)) continue;
        seen += 1;
        const result = await upsertDevice(device, `newest-${year}`);
        if (result === "created") created += 1;
        if (result === "updated") updated += 1;
      }

      if (payload.skipped) continue;
      if (!payload.has_next) break;
    }
  }

  return { created, updated, seen };
}

async function main() {
  await loadCheckpoint();
  console.log(`MobileAPI device seed starting with max ${MAX_REQUESTS} requests`);
  console.log(`Request delay: ${REQUEST_DELAY_MS}ms`);
  console.log(`Checkpoint entries loaded: ${checkpoint.size}`);
  console.log("This script only upserts Brand and HpCatalog rows. It does not delete or reset data.");

  const apple = SKIP_APPLE ? { created: 0, updated: 0, seen: 0 } : await seedAppleIphones();
  const newest = await seedNewestPhones();

  console.log("MobileAPI device seed complete");
  console.log(`Successful API requests used: ${successfulRequestCount}/${MAX_REQUESTS}`);
  console.log(`Rate-limit retries: ${rateLimitCount}`);
  console.log(`Checkpoint skips: ${skippedCheckpointCount}`);
  console.log(`Checkpoint entries saved: ${checkpoint.size}`);
  console.log(`Apple iPhone 6+ candidates: ${apple.seen}, created: ${apple.created}, updated: ${apple.updated}`);
  console.log(`Newest phone candidates: ${newest.seen}, created: ${newest.created}, updated: ${newest.updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
