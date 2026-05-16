"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RiFilter3Line, RiSearchLine } from "@remixicon/react"
import type { SupplierReturnsFilters } from "./types"

interface SupplierReturnsFilterProps {
  tokoId: string
  filters: SupplierReturnsFilters
  hasActiveFilter: boolean
}

export function SupplierReturnsFilter({ tokoId, filters, hasActiveFilter }: SupplierReturnsFilterProps) {
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const initialQuery = filters.query ?? ""
  const [searchDraft, setSearchDraft] = useState({ source: initialQuery, value: initialQuery })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamString = searchParams.toString()
  const hasAdvancedFilter = filters.status !== "all" || Boolean(filters.from) || Boolean(filters.to)
  const currentFilterQuery = filters.query ?? ""
  const searchQuery = searchDraft.source === currentFilterQuery ? searchDraft.value : currentFilterQuery

  useEffect(() => {
    const params = new URLSearchParams(searchParamString)
    const currentQuery = params.get("q") ?? ""
    if (searchQuery === currentQuery) return

    const timeoutId = window.setTimeout(() => {
      if (searchQuery) params.set("q", searchQuery)
      else params.delete("q")
      params.delete("page")
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
        <Input value={searchQuery} onChange={(event) => setSearchDraft({ source: currentFilterQuery, value: event.target.value })} placeholder="ID retur, sparepart, supplier, customer" className="pl-8" />
      </div>
    </label>
  )

  const renderAdvancedFields = () => (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Status</span>
        <Select name="status" defaultValue={filters.status || "all"}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Semua status" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Dikirim</SelectItem>
              <SelectItem value="replaced">Diganti supplier</SelectItem>
              <SelectItem value="refunded">Refund supplier</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Dari</span>
        <Input type="date" name="from" defaultValue={filters.from} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Sampai</span>
        <Input type="date" name="to" defaultValue={filters.to} />
      </label>
    </>
  )

  const renderActions = (className = "") => (
    <div className="flex items-end gap-2">
      <Button type="submit" className={className}>Terapkan</Button>
      {hasActiveFilter && <Button asChild variant="outline"><Link href={`/${tokoId}/inventory/supplier-returns`}>Reset</Link></Button>}
    </div>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Filter Retur</CardTitle>
              <CardDescription>Cari berdasarkan ID retur, sparepart, supplier, customer, device, atau tanggal.</CardDescription>
            </div>
            {hasActiveFilter && <Badge variant="outline" className="w-fit">Filter aktif</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:hidden">
            {renderSearchField()}
            <Button type="button" variant="outline" onClick={() => setFilterSheetOpen(true)}>
              <RiFilter3Line className="mr-1.5 size-4" />
              {hasAdvancedFilter ? "Filter aktif" : "Filter"}
            </Button>
            {hasActiveFilter && <Button asChild variant="outline"><Link href={`/${tokoId}/inventory/supplier-returns`}>Reset</Link></Button>}
          </div>
          <form className="hidden gap-3 lg:grid lg:grid-cols-[minmax(240px,1.4fr)_minmax(180px,0.8fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_auto]">
            <input type="hidden" name="q" value={searchQuery} />
            {renderSearchField()}
            {renderAdvancedFields()}
            {renderActions("flex-1 lg:flex-none")}
          </form>
        </CardContent>
      </Card>

      <Drawer open={filterSheetOpen} onOpenChange={setFilterSheetOpen} direction="bottom">
        <DrawerContent className="max-h-[90dvh] overflow-hidden p-0 before:inset-0 before:rounded-t-2xl lg:hidden">
          <div className="shrink-0 border-b bg-popover px-4 pb-4 pt-3">
            <DrawerTitle className="font-bold">Filter retur supplier</DrawerTitle>
          </div>
          <form className="p-4">
            <input type="hidden" name="q" value={searchQuery} />
            <div className="grid gap-3">{renderAdvancedFields()}</div>
            <div className="mt-5">{renderActions("w-full")}</div>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  )
}
