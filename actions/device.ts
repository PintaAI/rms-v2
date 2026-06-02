"use server"

import prisma from "@/lib/prisma"
import { getRequestUser } from "@/lib/auth/request-user"
import { assertFeature, assertPermission, getRequestScope } from "@/lib/auth/request-scope"
import { revalidatePath, cacheLife, cacheTag, updateTag } from "next/cache"
import { z } from "zod"

export interface Brand {
  id: string
  name: string
}

export interface Device {
  id: string
  modelName: string
  modelNumber: string | null
  brand: { id: string; name: string }
}

export interface DeviceListItem {
  id: string
  modelName: string
  brandName: string
  imageB64: string | null
}

export interface MobileApiDeviceSuggestion {
  mobileApiId: string
  brandName: string
  modelName: string
  modelNumber: string | null
  deviceType: string | null
  imageB64: string | null
  matchCertainty: string | null
  matchType: string | null
  description: string | null
}

export interface DeviceCatalogPayload {
  version: string
  devices: DeviceListItem[]
}

async function getDeviceWriteUser() {
  const user = await getRequestUser()
  if (!user) throw new Error("Unauthorized")

  const storeId = user.storeIds[0]
  if (!storeId) throw new Error("Toko tidak ditemukan")

  const scope = await getRequestScope(storeId)
  assertFeature(scope, "inventory.management")
  assertPermission(scope, "inventory.managePhoneUnits")

  return user
}

async function getDeviceCreateUser() {
  const user = await getRequestUser()
  if (!user) throw new Error("Unauthorized")

  const storeId = user.storeIds[0]
  if (!storeId) throw new Error("Toko tidak ditemukan")

  const scope = await getRequestScope(storeId)

  try {
    assertFeature(scope, "inventory.management")
    assertPermission(scope, "inventory.managePhoneUnits")
  } catch {
    assertFeature(scope, "service.management")
    assertPermission(scope, "service.create")
  }

  return user
}

async function getDeviceImportUser() {
  return getDeviceCreateUser()
}

function stripBrandPrefix(name: string, brandName: string) {
  const normalizedName = name.trim()
  const normalizedBrand = brandName.trim()
  if (!normalizedBrand) return normalizedName

  return normalizedName.toLowerCase().startsWith(`${normalizedBrand.toLowerCase()} `)
    ? normalizedName.slice(normalizedBrand.length).trim()
    : normalizedName
}

function getMobileApiKey() {
  return process.env.MOBILEAPI_API_KEY?.trim() || null
}

function getDeviceImageB64(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null
  const imageB64 = (metadata as Record<string, unknown>).imageB64
  return typeof imageB64 === "string" && imageB64.trim() ? imageB64 : null
}

function toMobileApiSuggestion(value: unknown): MobileApiDeviceSuggestion | null {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>
  const id = record.id
  const name = typeof record.name === "string" ? record.name : ""
  const brandName = typeof record.manufacturer_name === "string"
    ? record.manufacturer_name
    : typeof record.brand_name === "string"
      ? record.brand_name
      : typeof (record.brand as Record<string, unknown> | undefined)?.name === "string"
        ? String((record.brand as Record<string, unknown>).name)
        : ""

  if ((typeof id !== "string" && typeof id !== "number") || !name.trim() || !brandName.trim()) {
    return null
  }

  return {
    mobileApiId: String(id),
    brandName: brandName.trim(),
    modelName: stripBrandPrefix(name, brandName),
    modelNumber: typeof record.model_numbers === "string" ? record.model_numbers : null,
    deviceType: typeof record.device_type === "string" ? record.device_type : null,
    imageB64: typeof record.image_b64 === "string" ? record.image_b64 : null,
    matchCertainty: typeof record.match_certainty === "string" ? record.match_certainty : null,
    matchType: typeof record.match_type === "string" ? record.match_type : null,
    description: typeof record.description === "string" ? record.description : null,
  }
}

const mobileApiImportSchema = z.object({
  mobileApiId: z.string().min(1),
  brandName: z.string().min(1),
  modelName: z.string().min(1),
  modelNumber: z.string().nullable().optional(),
  deviceType: z.string().nullable().optional(),
  imageB64: z.string().nullable().optional(),
  matchCertainty: z.string().nullable().optional(),
  matchType: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

export async function getBrandList(): Promise<Brand[]> {
  'use cache'
  cacheTag('brands')

  const brands = await prisma.deviceBrand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 100,
  })

  return brands
}

export async function searchBrands(query: string): Promise<Brand[]> {
  'use cache'
  cacheTag('brands')

  if (!query.trim()) {
    const brands = await prisma.deviceBrand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 10,
    })
    return brands
  }

  const brands = await prisma.deviceBrand.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 10,
  })

  return brands
}

const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
})

export async function createBrand(name: string): Promise<Brand> {
  await getDeviceWriteUser()

  const validated = createBrandSchema.parse({ name })

  const existing = await prisma.deviceBrand.findUnique({
    where: { name: validated.name },
  })

  if (existing) {
    updateTag('brands')
    return existing
  }

  const brand = await prisma.deviceBrand.create({
    data: { name: validated.name },
    select: { id: true, name: true },
  })

  updateTag('brands')
  return brand
}

export async function getDeviceList(): Promise<DeviceListItem[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('devices')

  const devices = await prisma.deviceModel.findMany({
    orderBy: [{ brand: { name: "asc" } }, { modelName: "asc" }],
    select: {
      id: true,
      modelName: true,
      metadata: true,
      brand: { select: { id: true, name: true } },
    },
    take: 500,
  })

  return devices.map((d) => ({
    id: d.id,
    modelName: d.modelName,
    brandName: d.brand.name,
    imageB64: getDeviceImageB64(d.metadata),
  }))
}

export async function getDeviceCatalogVersion(): Promise<string> {
  'use cache'
  cacheLife('hours')
  cacheTag('devices', 'brands')

  const [deviceCount, deviceMeta, brandMeta] = await Promise.all([
    prisma.deviceModel.count(),
    prisma.deviceModel.aggregate({ _max: { updatedAt: true } }),
    prisma.deviceBrand.aggregate({ _max: { updatedAt: true } }),
  ])

  return [
    deviceCount,
    deviceMeta._max.updatedAt?.getTime() ?? 0,
    brandMeta._max.updatedAt?.getTime() ?? 0,
  ].join(':')
}

export async function getDeviceCatalog(): Promise<DeviceCatalogPayload> {
  'use cache'
  cacheLife('hours')
  cacheTag('devices', 'brands')

  const [version, devices] = await Promise.all([
    getDeviceCatalogVersion(),
    getDeviceList(),
  ])

  return { version, devices }
}

export async function searchDevices(query: string): Promise<DeviceListItem[]> {
  'use cache'
  cacheTag('devices')

  if (!query.trim()) {
    const devices = await prisma.deviceModel.findMany({
      orderBy: [{ brand: { name: "asc" } }, { modelName: "asc" }],
      select: {
        id: true,
        modelName: true,
        metadata: true,
        brand: { select: { name: true } },
      },
      take: 20,
    })
    return devices.map((d) => ({
      id: d.id,
      modelName: d.modelName,
      brandName: d.brand.name,
      imageB64: getDeviceImageB64(d.metadata),
    }))
  }

  const queryWords = query.trim().split(/\s+/)
  const firstWord = queryWords[0]
  const restWords = queryWords.slice(1).join(" ")

  const insensitiveMode = "insensitive" as const

  const devices = await prisma.deviceModel.findMany({
    where: {
      OR: [
        { modelName: { contains: query, mode: insensitiveMode } },
        { brand: { name: { contains: query, mode: insensitiveMode } } },
        ...(queryWords.length >= 2
          ? [
              {
                AND: [
                  { brand: { name: { contains: firstWord, mode: insensitiveMode } } },
                  { modelName: { contains: restWords, mode: insensitiveMode } },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: [{ brand: { name: "asc" } }, { modelName: "asc" }],
    select: {
      id: true,
      modelName: true,
      metadata: true,
      brand: { select: { name: true } },
    },
    take: 20,
  })

  return devices.map((d) => ({
    id: d.id,
    modelName: d.modelName,
    brandName: d.brand.name,
    imageB64: getDeviceImageB64(d.metadata),
  }))
}

export async function searchMobileApiDevices(query: string): Promise<MobileApiDeviceSuggestion[]> {
  const user = await getRequestUser()
  if (!user) throw new Error("Unauthorized")

  const apiKey = getMobileApiKey()
  const trimmed = query.trim()
  if (!apiKey || trimmed.length < 3) return []

  const params = new URLSearchParams({ name: trimmed, page: "1" })
  const response = await fetch(`https://api.mobileapi.dev/devices/search/?${params.toString()}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (response.status === 204) return []
  if (!response.ok) return []

  const payload = await response.json() as { devices?: unknown[] }
  return (payload.devices ?? [])
    .map(toMobileApiSuggestion)
    .filter((item): item is MobileApiDeviceSuggestion => Boolean(item))
    .slice(0, 8)
}

export async function importMobileApiDevice(data: MobileApiDeviceSuggestion): Promise<DeviceListItem> {
  await getDeviceImportUser()

  const validated = mobileApiImportSchema.parse(data)
  const existingBrand = await prisma.deviceBrand.findUnique({
    where: { name: validated.brandName },
    select: { id: true, name: true },
  })

  const brand = existingBrand ?? await prisma.deviceBrand.create({
    data: { name: validated.brandName },
    select: { id: true, name: true },
  })

  const metadata = {
    source: "mobileapi.dev",
    deviceType: validated.deviceType ?? null,
    imageB64: validated.imageB64 ?? null,
    matchCertainty: validated.matchCertainty ?? null,
    matchType: validated.matchType ?? null,
    description: validated.description ?? null,
  }

  const existingDevice = await prisma.deviceModel.findFirst({
    where: {
      OR: [
        { mobileApiId: validated.mobileApiId },
        { brandId: brand.id, modelName: validated.modelName },
      ],
    },
    include: { brand: { select: { name: true } } },
  })

  if (existingDevice) {
    const updated = await prisma.deviceModel.update({
      where: { id: existingDevice.id },
      data: {
        brandId: brand.id,
        modelName: validated.modelName,
        modelNumber: validated.modelNumber || existingDevice.modelNumber,
        mobileApiId: validated.mobileApiId,
        metadata,
      },
      include: { brand: { select: { name: true } } },
    })

    updateTag('devices')
    updateTag('brands')

    return {
      id: updated.id,
      modelName: updated.modelName,
      brandName: updated.brand.name,
      imageB64: getDeviceImageB64(updated.metadata),
    }
  }

  const device = await prisma.deviceModel.create({
    data: {
      brandId: brand.id,
      modelName: validated.modelName,
      modelNumber: validated.modelNumber || null,
      mobileApiId: validated.mobileApiId,
      metadata,
    },
    include: { brand: { select: { name: true } } },
  })

  revalidatePath("/dashboard/admin/devices")
  revalidatePath("/dashboard/staff/services")
  updateTag('devices')
  updateTag('brands')

  return {
    id: device.id,
    modelName: device.modelName,
    brandName: device.brand.name,
    imageB64: getDeviceImageB64(device.metadata),
  }
}

export async function getDevice(id: string): Promise<Device> {
  'use cache'
  cacheTag('devices')

  const device = await prisma.deviceModel.findUnique({
    where: { id },
    select: {
      id: true,
      modelName: true,
      modelNumber: true,
      brand: { select: { id: true, name: true } },
    },
  })

  if (!device) throw new Error("Device not found")

  return device
}

const createDeviceSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  modelName: z.string().min(1, "Model name is required"),
  modelNumber: z.string().optional(),
})

export async function createDevice(
  data: z.infer<typeof createDeviceSchema>
): Promise<DeviceListItem> {
  await getDeviceCreateUser()

  const validated = createDeviceSchema.parse(data)

  const existingBrand = await prisma.deviceBrand.findUnique({
    where: { name: validated.brandName },
    select: { id: true, name: true },
  })

  const brand = existingBrand ?? await prisma.deviceBrand.create({
    data: { name: validated.brandName },
    select: { id: true, name: true },
  })

  const existingDevice = await prisma.deviceModel.findFirst({
    where: {
      brandId: brand.id,
      modelName: validated.modelName,
    },
    include: { brand: { select: { name: true } } },
  })

  if (existingDevice) {
    updateTag('devices')
    updateTag('brands')
    return {
      id: existingDevice.id,
      modelName: existingDevice.modelName,
      brandName: existingDevice.brand.name,
      imageB64: getDeviceImageB64(existingDevice.metadata),
    }
  }

  const device = await prisma.deviceModel.create({
    data: {
      brandId: brand.id,
      modelName: validated.modelName,
      modelNumber: validated.modelNumber || null,
    },
    include: { brand: { select: { name: true } } },
  })

  revalidatePath("/dashboard/admin/devices")
  revalidatePath("/dashboard/staff/services")
  updateTag('devices')
  updateTag('brands')

  return {
    id: device.id,
    modelName: device.modelName,
    brandName: device.brand.name,
    imageB64: getDeviceImageB64(device.metadata),
  }
}

const updateDeviceSchema = z.object({
  id: z.string(),
  brandName: z.string().min(1).optional(),
  modelName: z.string().min(1).optional(),
  modelNumber: z.string().optional(),
})

export async function updateDevice(
  data: z.infer<typeof updateDeviceSchema>
): Promise<Device> {
  await getDeviceWriteUser()

  const validated = updateDeviceSchema.parse(data)

  const device = await prisma.deviceModel.findUnique({
    where: { id: validated.id },
    include: { brand: { select: { id: true, name: true } } },
  })

  if (!device) throw new Error("Device not found")

  let brandId = device.brand.id

  if (validated.brandName && validated.brandName !== device.brand.name) {
    let brand = await prisma.deviceBrand.findUnique({
      where: { name: validated.brandName },
    })

    if (!brand) {
      brand = await prisma.deviceBrand.create({
        data: { name: validated.brandName },
      })
    }

    brandId = brand.id
  }

  const updated = await prisma.deviceModel.update({
    where: { id: validated.id },
    data: {
      brandId,
      modelName: validated.modelName ?? device.modelName,
      modelNumber: validated.modelNumber ?? device.modelNumber,
    },
    select: {
      id: true,
      modelName: true,
      modelNumber: true,
      brand: { select: { id: true, name: true } },
    },
  })

  revalidatePath("/dashboard/admin/devices")
  updateTag('devices')
  updateTag('brands')

  return updated
}

export async function deleteDevice(id: string): Promise<void> {
  await getDeviceWriteUser()

  const device = await prisma.deviceModel.findUnique({
    where: { id },
    select: {
      id: true,
      repairOrders: { select: { id: true }, take: 1 },
      compatibilities: { select: { inventoryItemId: true }, take: 1 },
    },
  })

  if (!device) throw new Error("Device not found")

  if (device.repairOrders.length > 0) {
    throw new Error("Cannot delete device that has service records")
  }

  if (device.compatibilities.length > 0) {
    await prisma.partCompatibility.deleteMany({
      where: { deviceModelId: id },
    })
  }

  await prisma.deviceModel.delete({ where: { id } })

  revalidatePath("/dashboard/admin/devices")
  updateTag('devices')
}
