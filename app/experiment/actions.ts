"use server";

import { connection } from "next/server";
import {
  cacheLife,
  cacheTag,
  revalidatePath,
  revalidateTag,
  updateTag,
} from "next/cache";
import { faker } from "@faker-js/faker";

const logTimestamp = () => new Date().toISOString();

export async function getStaticData() {
  "use cache";
  cacheLife("max");
  cacheTag("static-demo");

  console.log(`[BUILD] Static data computed - this runs once per build`);
  return {
    message: "This is cached static content - computed once per build",
    buildTime: "Cached at build time",
    mathResult: Math.PI * 2,
    constantValue: "This value never changes between requests",
  };
}

export async function getCachedSeconds() {
  "use cache";
  cacheLife("seconds");
  cacheTag("cache-demo-seconds");

  const now = Date.now();
  console.log(`[${logTimestamp()}] [SERVER] Cached (seconds) - EXECUTED/FRESH DATA`);
  console.log(`[${logTimestamp()}] [SERVER] Cache key timestamp: ${now}`);

  return {
    profile: "seconds",
    message: "Real-time data (30s stale, 1s revalidate, 1m expire)",
    fetchedAt: now,
    serverTime: new Date().toISOString(),
    randomId: faker.string.uuid(),
    products: Array.from({ length: 3 }, () => ({
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      price: parseFloat(faker.commerce.price()),
    })),
  };
}

export async function getCachedMinutes() {
  "use cache";
  cacheLife("minutes");
  cacheTag("cache-demo-minutes");

  const now = Date.now();
  console.log(`[${logTimestamp()}] [SERVER] Cached (minutes) - EXECUTED/FRESH DATA`);
  console.log(`[${logTimestamp()}] [SERVER] Cache key timestamp: ${now}`);

  return {
    profile: "minutes",
    message: "Frequently updated (5m stale, 1m revalidate, 1h expire)",
    fetchedAt: now,
    serverTime: new Date().toISOString(),
    articles: Array.from({ length: 3 }, () => ({
      id: faker.string.uuid(),
      title: faker.lorem.sentence(),
      excerpt: faker.lorem.paragraph(),
    })),
  };
}

export async function getCachedHours() {
  "use cache";
  cacheLife("hours");
  cacheTag("cache-demo-hours");

  const now = Date.now();
  console.log(`[${logTimestamp()}] [SERVER] Cached (hours) - EXECUTED/FRESH DATA`);
  console.log(`[${logTimestamp()}] [SERVER] Cache key timestamp: ${now}`);

  return {
    profile: "hours",
    message: "Multiple daily updates (5m stale, 1h revalidate, 1d expire)",
    fetchedAt: now,
    serverTime: new Date().toISOString(),
    stats: {
      views: faker.number.int({ min: 1000, max: 50000 }),
      clicks: faker.number.int({ min: 100, max: 5000 }),
      conversions: faker.number.int({ min: 10, max: 500 }),
    },
  };
}

export async function getCachedDays() {
  "use cache";
  cacheLife("days");
  cacheTag("cache-demo-days");

  const now = Date.now();
  console.log(`[${logTimestamp()}] [SERVER] Cached (days) - EXECUTED/FRESH DATA`);
  console.log(`[${logTimestamp()}] [SERVER] Cache key timestamp: ${now}`);

  return {
    profile: "days",
    message: "Daily updates (5m stale, 1d revalidate, 1w expire)",
    fetchedAt: now,
    serverTime: new Date().toISOString(),
    weeklyReport: {
      week: faker.date.recent().toLocaleDateString(),
      revenue: faker.finance.amount({ min: 10000, max: 100000 }),
      orders: faker.number.int({ min: 100, max: 1000 }),
    },
  };
}

export async function getCachedMax() {
  "use cache";
  cacheLife("max");
  cacheTag("cache-demo-max");

  const now = Date.now();
  console.log(`[${logTimestamp()}] [SERVER] Cached (max) - EXECUTED/FRESH DATA`);
  console.log(`[${logTimestamp()}] [SERVER] Cache key timestamp: ${now}`);

  return {
    profile: "max",
    message: "Rarely changes (5m stale, 30d revalidate, 1y expire)",
    fetchedAt: now,
    serverTime: new Date().toISOString(),
    config: {
      appName: faker.company.name(),
      version: "1.0.0",
      features: ["analytics", "dashboard", "reports"],
    },
  };
}

export async function getCachedCustom() {
  "use cache";
  cacheLife({
    stale: 120,
    revalidate: 300,
    expire: 600,
  });
  cacheTag("cache-demo-custom");

  const now = Date.now();
  console.log(`[${logTimestamp()}] [SERVER] Cached (custom) - EXECUTED/FRESH DATA`);
  console.log(`[${logTimestamp()}] [SERVER] Custom profile: stale=120s, revalidate=300s, expire=600s`);

  return {
    profile: "custom",
    message: "Custom profile (2m stale, 5m revalidate, 10m expire)",
    fetchedAt: now,
    serverTime: new Date().toISOString(),
    promotion: {
      code: faker.string.alphanumeric(6).toUpperCase(),
      discount: faker.number.int({ min: 10, max: 50 }),
      expiresAt: faker.date.future().toISOString(),
    },
  };
}

export async function getDynamicData() {
  await connection();

  const now = Date.now();
  console.log(`[${logTimestamp()}] [SERVER] Dynamic (no cache) - EXECUTED ON EVERY REQUEST`);
  console.log(`[${logTimestamp()}] [SERVER] Request timestamp: ${now}`);

  return {
    message: "Dynamic content - fresh on every request via connection()",
    requestTime: now,
    serverTime: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    liveData: {
      currentUsers: faker.number.int({ min: 50, max: 200 }),
      serverLoad: faker.number.float({ min: 0.1, max: 0.9 }),
      uptime: `${faker.number.int({ min: 1, max: 99 })}%`,
    },
  };
}

export async function getTaggedData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("tagged-data", "demo-collection");

  const now = Date.now();
  console.log(`[${logTimestamp()}] [SERVER] Tagged cache - EXECUTED/FRESH DATA`);
  console.log(`[${logTimestamp()}] [SERVER] Tags: tagged-data, demo-collection`);

  return {
    message: "Tagged data - can be invalidated by tag",
    fetchedAt: now,
    serverTime: new Date().toISOString(),
    items: Array.from({ length: 5 }, () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      role: faker.person.jobTitle(),
    })),
  };
}

export async function triggerRevalidatePath(path: string) {
  console.log(`[${logTimestamp()}] [SERVER] revalidatePath called for: ${path}`);
  revalidatePath(path);
  console.log(`[${logTimestamp()}] [SERVER] Path revalidation complete`);
}

export async function triggerRevalidateTag(tag: string) {
  console.log(`[${logTimestamp()}] [SERVER] revalidateTag called for: ${tag}`);
  revalidateTag(tag, "max");
  console.log(`[${logTimestamp()}] [SERVER] Tag revalidation (SWR) complete`);
}

export async function triggerUpdateTag(tag: string) {
  console.log(`[${logTimestamp()}] [SERVER] updateTag called for: ${tag}`);
  updateTag(tag);
  console.log(`[${logTimestamp()}] [SERVER] Tag update (immediate) complete`);
}

export async function triggerRevalidateAll() {
  console.log(`[${logTimestamp()}] [SERVER] Full revalidation triggered`);
  revalidatePath("/", "layout");
  updateTag("cache-demo-seconds");
  updateTag("cache-demo-minutes");
  updateTag("cache-demo-hours");
  updateTag("cache-demo-days");
  updateTag("cache-demo-max");
  updateTag("cache-demo-custom");
  updateTag("tagged-data");
  updateTag("demo-collection");
  console.log(`[${logTimestamp()}] [SERVER] All caches invalidated`);
}