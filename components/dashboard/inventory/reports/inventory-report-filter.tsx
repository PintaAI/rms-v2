import Link from "next/link"
import type { InventoryReportCategory } from "@/actions/inventory"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RiSearchLine } from "@remixicon/react"
import type { InventoryReportFilters } from "./types"

interface InventoryReportFilterProps {
  tokoId: string
  filters: InventoryReportFilters
  categories: InventoryReportCategory[]
  hasActiveFilter: boolean
}

export function InventoryReportFilter({
  tokoId,
  filters,
  categories,
  hasActiveFilter,
}: InventoryReportFilterProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Filter Laporan</CardTitle>
            <CardDescription>Cari sparepart berdasarkan nama, barcode, supplier, kategori, atau status stok.</CardDescription>
          </div>
          {hasActiveFilter && <Badge variant="outline" className="w-fit">Filter aktif</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_minmax(180px,0.9fr)_minmax(160px,0.7fr)_auto]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Pencarian</span>
            <div className="relative">
              <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={filters.q}
                placeholder="Nama sparepart, barcode, supplier"
                className="pl-8"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Kategori</span>
            <Select name="categoryId" defaultValue={filters.categoryId || "all"}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <Select name="status" defaultValue={filters.status}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="safe">Stok aman</SelectItem>
                  <SelectItem value="critical">Stok kritis</SelectItem>
                  <SelectItem value="out">Stok habis</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>

          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1 lg:flex-none">Terapkan</Button>
            {hasActiveFilter && (
              <Button asChild variant="outline">
                <Link href={`/${tokoId}/admin/inventory/reports`}>Reset</Link>
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
