"use server"

import prisma from "@/lib/prisma"
import type { ActionResult, ActionResultWithData } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
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

export async function getBrandList(): Promise<ActionResultWithData<Brand[]>> {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 100,
    })

    return { success: true, data: brands }
  } catch (error) {
    console.error("Error fetching brands:", error)
    return { success: false, error: "Failed to fetch brands" }
  }
}

export async function searchBrands(query: string): Promise<ActionResultWithData<Brand[]>> {
  try {
    if (!query.trim()) {
      const brands = await prisma.brand.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
        take: 10,
      })
      return { success: true, data: brands }
    }

    const brands = await prisma.brand.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 10,
    })

    return { success: true, data: brands }
  } catch (error) {
    console.error("Error searching brands:", error)
    return { success: false, error: "Failed to search brands" }
  }
}

const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
})

export async function createBrand(
  name: string
): Promise<ActionResultWithData<Brand>> {
  try {
    const validated = createBrandSchema.parse({ name })

    const existing = await prisma.brand.findUnique({
      where: { name: validated.name },
    })

    if (existing) {
      return { success: true, data: existing }
    }

    const brand = await prisma.brand.create({
      data: { name: validated.name },
      select: { id: true, name: true },
    })

    return { success: true, data: brand }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error creating brand:", error)
    return { success: false, error: "Failed to create brand" }
  }
}

export async function getDeviceList(): Promise<ActionResultWithData<DeviceListItem[]>> {
  try {
    const devices = await prisma.hpCatalog.findMany({
      orderBy: [{ brand: { name: "asc" } }, { modelName: "asc" }],
      select: {
        id: true,
        modelName: true,
        brand: { select: { id: true, name: true } },
      },
      take: 500,
    })

    return {
      success: true,
      data: devices.map((d) => ({
        id: d.id,
        modelName: d.modelName,
        brandName: d.brand.name,
      })),
    }
  } catch (error) {
    console.error("Error fetching devices:", error)
    return { success: false, error: "Failed to fetch devices" }
  }
}

export async function searchDevices(query: string): Promise<ActionResultWithData<DeviceListItem[]>> {
  try {
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
      return {
        success: true,
        data: devices.map((d) => ({
          id: d.id,
          modelName: d.modelName,
          brandName: d.brand.name,
        })),
      }
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

    return {
      success: true,
      data: devices.map((d) => ({
        id: d.id,
        modelName: d.modelName,
        brandName: d.brand.name,
      })),
    }
  } catch (error) {
    console.error("Error searching devices:", error)
    return { success: false, error: "Failed to search devices" }
  }
}

export async function getDevice(id: string): Promise<ActionResultWithData<Device>> {
  try {
    const device = await prisma.hpCatalog.findUnique({
      where: { id },
      select: {
        id: true,
        modelName: true,
        modelNumber: true,
        brand: { select: { id: true, name: true } },
      },
    })

    if (!device) return { success: false, error: "Device not found" }

    return { success: true, data: device }
  } catch (error) {
    console.error("Error fetching device:", error)
    return { success: false, error: "Failed to fetch device" }
  }
}

const createDeviceSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  modelName: z.string().min(1, "Model name is required"),
  modelNumber: z.string().optional(),
})

export async function createDevice(
  data: z.infer<typeof createDeviceSchema>
): Promise<ActionResultWithData<DeviceListItem>> {
  try {
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
      return {
        success: true,
        data: {
          id: existingDevice.id,
          modelName: existingDevice.modelName,
          brandName: existingDevice.brand.name,
        },
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

    return {
      success: true,
      data: {
        id: device.id,
        modelName: device.modelName,
        brandName: device.brand.name,
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error creating device:", error)
    return { success: false, error: "Failed to create device" }
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
): Promise<ActionResultWithData<Device>> {
  try {
    const validated = updateDeviceSchema.parse(data)

    const device = await prisma.hpCatalog.findUnique({
      where: { id: validated.id },
      include: { brand: { select: { id: true, name: true } } },
    })

    if (!device) return { success: false, error: "Device not found" }

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

    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error("Error updating device:", error)
    return { success: false, error: "Failed to update device" }
  }
}

export async function deleteDevice(id: string): Promise<ActionResult> {
  try {
    const device = await prisma.hpCatalog.findUnique({
      where: { id },
      select: {
        id: true,
        services: { select: { id: true }, take: 1 },
        compatibilities: { select: { sparepartId: true }, take: 1 },
      },
    })

    if (!device) return { success: false, error: "Device not found" }

    if (device.services.length > 0) {
      return { success: false, error: "Cannot delete device that has service records" }
    }

    if (device.compatibilities.length > 0) {
      await prisma.sparepartCompatibility.deleteMany({
        where: { hpCatalogId: id },
      })
    }

    await prisma.hpCatalog.delete({ where: { id } })

    revalidatePath("/dashboard/admin/devices")

    return { success: true }
  } catch (error) {
    console.error("Error deleting device:", error)
    return { success: false, error: "Failed to delete device" }
  }
}
