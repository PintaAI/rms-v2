"use server"

import prisma from "@/lib/prisma"
import { getAuthUser, isAdmin } from "@/lib/rbac"
import { revalidatePath, cacheTag, updateTag } from "next/cache"
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
}

async function getDeviceWriteUser() {
  const user = await getAuthUser()
  if (!user) throw new Error("Unauthorized")
  if (!isAdmin(user)) throw new Error("Only admins can manage device data")
  return user
}

export async function getBrandList(): Promise<Brand[]> {
  'use cache'
  cacheTag('brands')

  const brands = await prisma.brand.findMany({
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
    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 10,
    })
    return brands
  }

  const brands = await prisma.brand.findMany({
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

  const existing = await prisma.brand.findUnique({
    where: { name: validated.name },
  })

  if (existing) {
    updateTag('brands')
    return existing
  }

  const brand = await prisma.brand.create({
    data: { name: validated.name },
    select: { id: true, name: true },
  })

  updateTag('brands')
  return brand
}

export async function getDeviceList(): Promise<DeviceListItem[]> {
  'use cache'
  cacheTag('devices')

  const devices = await prisma.hpCatalog.findMany({
    orderBy: [{ brand: { name: "asc" } }, { modelName: "asc" }],
    select: {
      id: true,
      modelName: true,
      brand: { select: { id: true, name: true } },
    },
    take: 500,
  })

  return devices.map((d) => ({
    id: d.id,
    modelName: d.modelName,
    brandName: d.brand.name,
  }))
}

export async function searchDevices(query: string): Promise<DeviceListItem[]> {
  'use cache'
  cacheTag('devices')

  if (!query.trim()) {
    const devices = await prisma.hpCatalog.findMany({
      orderBy: [{ brand: { name: "asc" } }, { modelName: "asc" }],
      select: {
        id: true,
        modelName: true,
        brand: { select: { name: true } },
      },
      take: 20,
    })
    return devices.map((d) => ({
      id: d.id,
      modelName: d.modelName,
      brandName: d.brand.name,
    }))
  }

  const queryWords = query.trim().split(/\s+/)
  const firstWord = queryWords[0]
  const restWords = queryWords.slice(1).join(" ")

  const insensitiveMode = "insensitive" as const

  const devices = await prisma.hpCatalog.findMany({
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
      brand: { select: { name: true } },
    },
    take: 20,
  })

  return devices.map((d) => ({
    id: d.id,
    modelName: d.modelName,
    brandName: d.brand.name,
  }))
}

export async function getDevice(id: string): Promise<Device> {
  'use cache'
  cacheTag('devices')

  const device = await prisma.hpCatalog.findUnique({
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
  await getDeviceWriteUser()

  const validated = createDeviceSchema.parse(data)

  const existingBrand = await prisma.brand.findUnique({
    where: { name: validated.brandName },
    select: { id: true, name: true },
  })

  const brand = existingBrand ?? await prisma.brand.create({
    data: { name: validated.brandName },
    select: { id: true, name: true },
  })

  const existingDevice = await prisma.hpCatalog.findFirst({
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
    }
  }

  const device = await prisma.hpCatalog.create({
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

  const device = await prisma.hpCatalog.findUnique({
    where: { id: validated.id },
    include: { brand: { select: { id: true, name: true } } },
  })

  if (!device) throw new Error("Device not found")

  let brandId = device.brand.id

  if (validated.brandName && validated.brandName !== device.brand.name) {
    let brand = await prisma.brand.findUnique({
      where: { name: validated.brandName },
    })

    if (!brand) {
      brand = await prisma.brand.create({
        data: { name: validated.brandName },
      })
    }

    brandId = brand.id
  }

  const updated = await prisma.hpCatalog.update({
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

  const device = await prisma.hpCatalog.findUnique({
    where: { id },
    select: {
      id: true,
      services: { select: { id: true }, take: 1 },
      compatibilities: { select: { sparepartId: true }, take: 1 },
    },
  })

  if (!device) throw new Error("Device not found")

  if (device.services.length > 0) {
    throw new Error("Cannot delete device that has service records")
  }

  if (device.compatibilities.length > 0) {
    await prisma.sparepartCompatibility.deleteMany({
      where: { hpCatalogId: id },
    })
  }

  await prisma.hpCatalog.delete({ where: { id } })

  revalidatePath("/dashboard/admin/devices")
  updateTag('devices')
}
