"use client"

import Link from "next/link"
import type { InventoryReportCategory } from "@/actions/inventory"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RiFilter3Line, RiSearchLine } from "@remixicon/react"
import { useEffect, useState } from "react"
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState({ source: filters.q, value: filters.q })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamString = searchParams.toString()
  const hasActiveAdvancedFilter = filters.categoryId !== "all" || filters.status !== "all"
  const searchQuery = searchDraft.source === filters.q ? searchDraft.value : filters.q

  useEffect(() => {
    const params = new URLSearchParams(searchParamString)
    const currentQuery = params.get("q") ?? ""

    if (searchQuery === currentQuery) return

    const timeoutId = window.setTimeout(() => {
      if (searchQuery) {
        params.set("q", searchQuery)
      } else {
        params.delete("q")
      }

      const nextQuery = params.toString()
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [pathname, router, searchParamString, searchQuery])

  const renderSearchField = () => (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">Pencarian</span>
      <div className="relative">
        <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          value={searchQuery}
          onChange={(event) => setSearchDraft({ source: filters.q, value: event.target.value })}
          placeholder="Nama sparepart, barcode, supplier"
          className="pl-8"
        />
      </div>
    </label>
  )

  const renderAdvancedFilterFields = () => (
    <>
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
    </>
  )

  const renderFilterFields = () => (
    <>
      {renderSearchField()}
      {renderAdvancedFilterFields()}
    </>
  )

  const renderActions = (buttonClassName = "") => (
    <div className="flex items-end gap-2">
      <Button type="submit" className={buttonClassName}>Terapkan</Button>
      {hasActiveFilter && (
        <Button asChild variant="outline">
          <Link href={`/${tokoId}/admin/inventory/reports`}>Reset</Link>
        </Button>
      )}
    </div>
  )

  return (
    <>
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
          <div className="grid gap-3 lg:hidden">
            {renderSearchField()}
            <div className="grid gap-2">
              <Button type="button" variant="outline" onClick={() => setFilterSheetOpen(true)}>
                <RiFilter3Line className="mr-1.5 size-4" />
                {hasActiveAdvancedFilter ? "Filter aktif" : "Filter"}
              </Button>
            </div>
            {hasActiveFilter && (
              <Button asChild variant="outline">
                <Link href={`/${tokoId}/admin/inventory/reports`}>Reset</Link>
              </Button>
            )}
          </div>
          <form className="hidden gap-3 lg:grid lg:grid-cols-[minmax(220px,1.3fr)_minmax(180px,0.9fr)_minmax(160px,0.7fr)_auto]">
            {renderFilterFields()}
            {renderActions("flex-1 lg:flex-none")}
          </form>
        </CardContent>
      </Card>

      <Drawer open={filterSheetOpen} onOpenChange={setFilterSheetOpen} direction="bottom">
        <DrawerContent className="max-h-[90dvh] overflow-hidden p-0 before:inset-0 before:rounded-t-2xl lg:hidden">
          <div className="shrink-0 border-b bg-popover px-4 pb-4 pt-3">
            <DrawerTitle className="font-bold">Filter laporan</DrawerTitle>
          </div>
          <form className="p-4">
            <input type="hidden" name="q" value={searchQuery} />
            <div className="grid gap-3">
              {renderAdvancedFilterFields()}
            </div>
            <div className="mt-5">
              {renderActions("w-full")}
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  )
}
