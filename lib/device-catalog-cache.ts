import type { DeviceCatalogPayload, DeviceListItem } from "@/actions/device";

const DEVICE_CATALOG_CACHE_KEY = "rms:device-catalog:v1";

type StoredDeviceCatalog = DeviceCatalogPayload & {
  savedAt: number;
};

function readStoredCatalog(): StoredDeviceCatalog | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DEVICE_CATALOG_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredDeviceCatalog;
    if (!parsed.version || !Array.isArray(parsed.devices)) return null;

    return parsed;
  } catch {
    window.localStorage.removeItem(DEVICE_CATALOG_CACHE_KEY);
    return null;
  }
}

function writeStoredCatalog(catalog: DeviceCatalogPayload): StoredDeviceCatalog {
  const next = { ...catalog, savedAt: Date.now() };
  window.localStorage.setItem(DEVICE_CATALOG_CACHE_KEY, JSON.stringify(next));
  return next;
}

async function fetchDeviceCatalog(): Promise<StoredDeviceCatalog> {
  const response = await fetch("/api/devices/catalog", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load device catalog");
  }

  return writeStoredCatalog(await response.json() as DeviceCatalogPayload);
}

async function fetchDeviceCatalogVersion(): Promise<string> {
  const response = await fetch("/api/devices/catalog-version", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load device catalog version");
  }

  const payload = await response.json() as { version: string };
  return payload.version;
}

export async function loadDeviceCatalog(): Promise<DeviceCatalogPayload> {
  const stored = readStoredCatalog();

  if (!stored) {
    return fetchDeviceCatalog();
  }

  const version = await fetchDeviceCatalogVersion();
  if (version === stored.version) {
    return stored;
  }

  return fetchDeviceCatalog();
}

export async function refreshDeviceCatalogIfStale(): Promise<DeviceCatalogPayload | null> {
  const stored = readStoredCatalog();
  if (!stored) return null;

  const version = await fetchDeviceCatalogVersion();
  if (version === stored.version) return stored;

  return fetchDeviceCatalog();
}

export function upsertStoredDevice(device: DeviceListItem): DeviceCatalogPayload | null {
  const stored = readStoredCatalog();
  if (!stored) return null;

  const devices = stored.devices.some((item) => item.id === device.id)
    ? stored.devices.map((item) => (item.id === device.id ? device : item))
    : [...stored.devices, device].sort((a, b) => {
        const brandCompare = a.brandName.localeCompare(b.brandName);
        return brandCompare === 0 ? a.modelName.localeCompare(b.modelName) : brandCompare;
      });

  return writeStoredCatalog({ version: stored.version, devices });
}
