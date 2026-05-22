"use client"

import Link from "next/link"
import { useState } from "react"
import type { SupplierReturnRow } from "@/actions/supplier-returns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import { RiCalendarLine, RiExchangeBoxLine, RiExternalLinkLine, RiMore2Line } from "@remixicon/react"
import { SupplierReturnActionDialog, type SupplierReturnAction } from "./supplier-return-action-dialog"
import { SupplierReturnStatusBadge } from "./supplier-return-status-badge"
import type { SupplierReturnsData, SupplierReturnsFilters } from "./types"

interface SupplierReturnsListProps {
  tokoId: string
  data: SupplierReturnsData
  filters: SupplierReturnsFilters
}

const buildSupplierReturnsHref = (tokoId: string, params: SupplierReturnsFilters & { page?: number }) => {
  const search = new URLSearchParams()
  if (params.query) search.set("q", params.query)
  if (params.status && params.status !== "all") search.set("status", params.status)
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const query = search.toString()
  return `/${tokoId}/inventory/supplier-returns${query ? `?${query}` : ""}`
}

export function SupplierReturnsList({ tokoId, data, filters }: SupplierReturnsListProps) {
  const [selected, setSelected] = useState<SupplierReturnRow | null>(null)
  const [action, setAction] = useState<SupplierReturnAction | null>(null)

  const openAction = (item: SupplierReturnRow, nextAction: SupplierReturnAction) => {
    setSelected(item)
    setAction(nextAction)
  }

  const closeDialog = (open: boolean) => {
    if (open) return
    setSelected(null)
    setAction(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Daftar Retur Supplier</CardTitle>
              <CardDescription>{data.totalItems} retur ditemukan</CardDescription>
            </div>
            {data.totalPages > 1 && <Badge variant="outline" className="w-fit">Halaman {data.page} / {data.totalPages}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-background ring-1 ring-border">
                <RiExchangeBoxLine className="size-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium">Belum ada retur supplier.</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Retur akan muncul saat klaim garansi ganti inventoryItem dicatat sebagai retur supplier.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="hidden overflow-x-auto rounded-lg border lg:block">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Sparepart</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Asal Klaim</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <RiCalendarLine className="size-3.5" />
                            {formatDate(item.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-52">
                          <div className="font-medium">{item.inventoryItem.name}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{item.id}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                        <TableCell>{item.supplierName || "-"}</TableCell>
                        <TableCell className="min-w-56">{renderClaimContext(tokoId, item)}</TableCell>
                        <TableCell><SupplierReturnStatusBadge status={item.status} /></TableCell>
                        <TableCell className="text-right"><RowActions item={item} onAction={openAction} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 lg:hidden">
                {data.items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{item.inventoryItem.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                      </div>
                      <SupplierReturnStatusBadge status={item.status} />
                    </div>
                    <div className="grid gap-2 rounded-md bg-background/70 p-2 text-xs sm:grid-cols-2">
                      <div className="text-muted-foreground">Qty: <span className="text-foreground tabular-nums">{item.qty}</span></div>
                      <div className="text-muted-foreground">Supplier: <span className="text-foreground">{item.supplierName || "-"}</span></div>
                      <div className="sm:col-span-2">{renderClaimContext(tokoId, item)}</div>
                    </div>
                    <div className="flex justify-end"><RowActions item={item} onAction={openAction} /></div>
                  </div>
                ))}
              </div>

              {data.totalPages > 1 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
                  <span className="text-xs text-muted-foreground">Halaman {data.page} dari {data.totalPages}</span>
                  <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        {data.page <= 1 ? <Button variant="outline" disabled>Sebelumnya</Button> : <PaginationPrevious href={buildSupplierReturnsHref(tokoId, { ...filters, page: data.page - 1 })} text="Sebelumnya" />}
                      </PaginationItem>
                      <PaginationItem>
                        {data.page >= data.totalPages ? <Button variant="outline" disabled>Berikutnya</Button> : <PaginationNext href={buildSupplierReturnsHref(tokoId, { ...filters, page: data.page + 1 })} text="Berikutnya" />}
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierReturnActionDialog item={selected} action={action} open={Boolean(selected && action)} onOpenChange={closeDialog} />
    </>
  )
}

function renderClaimContext(tokoId: string, item: SupplierReturnRow) {
  if (!item.warrantyClaim) return <span className="text-muted-foreground">Manual / tanpa klaim</span>
  return (
    <div className="min-w-0">
      <div className="truncate font-medium">{item.warrantyClaim.customerName || "Customer"}</div>
      <div className="truncate text-xs text-muted-foreground">{item.warrantyClaim.deviceName}</div>
      <Button asChild variant="link" className="h-auto p-0 text-xs">
        <Link href={`/${tokoId}/service?serviceId=${encodeURIComponent(item.warrantyClaim.repairOrderId)}`}>
          <RiExternalLinkLine data-icon="inline-start" />
          Lihat service
        </Link>
      </Button>
    </div>
  )
}

function RowActions({ item, onAction }: { item: SupplierReturnRow; onAction: (item: SupplierReturnRow, action: SupplierReturnAction) => void }) {
  const canMarkSent = item.status === "pending"
  const canResolve = item.status === "pending" || item.status === "sent"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="Aksi retur supplier">
          <RiMore2Line />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onAction(item, "detail")}>View detail</DropdownMenuItem>
          {canMarkSent && <DropdownMenuItem onSelect={() => onAction(item, "sent")}>Tandai dikirim</DropdownMenuItem>}
          {canResolve && <DropdownMenuItem onSelect={() => onAction(item, "replaced")}>Tandai diganti supplier</DropdownMenuItem>}
          {canResolve && <DropdownMenuItem onSelect={() => onAction(item, "refunded")}>Tandai refund supplier</DropdownMenuItem>}
          {canResolve && <DropdownMenuItem variant="destructive" onSelect={() => onAction(item, "rejected")}>Tolak retur</DropdownMenuItem>}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
