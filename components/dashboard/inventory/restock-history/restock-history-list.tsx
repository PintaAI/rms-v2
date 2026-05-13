import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { RiBarcodeLine, RiCalendarLine, RiHistoryLine, RiUserLine } from "@remixicon/react"
import type { RestockHistoryData, RestockHistoryFilters } from "./types"

interface RestockHistoryListProps {
  tokoId: string
  history: RestockHistoryData
  filters: RestockHistoryFilters
}

const buildHistoryHref = (
  tokoId: string,
  params: RestockHistoryFilters & { page?: number }
) => {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.userId) search.set("userId", params.userId)
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const query = search.toString()
  return `/${tokoId}/admin/inventory/restock-history${query ? `?${query}` : ""}`
}

export function RestockHistoryList({ tokoId, history, filters }: RestockHistoryListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Daftar Restock</CardTitle>
            <CardDescription>{history.totalItems} transaksi ditemukan</CardDescription>
          </div>
          {history.totalPages > 1 && (
            <Badge variant="outline" className="w-fit">Halaman {history.page} / {history.totalPages}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {history.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-background ring-1 ring-border">
              <RiHistoryLine className="size-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">Belum ada riwayat restock yang cocok</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Coba ubah kata kunci, user, atau rentang tanggal untuk melihat transaksi stok masuk lainnya.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Sparepart</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga Beli</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead>Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <RiCalendarLine className="size-3.5" />
                          {formatDate(new Date(item.createdAt))}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-52">
                        <div className="font-medium">{item.sparepartName || "Sparepart"}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <RiBarcodeLine className="size-3" />
                          <span className="truncate">{item.sparepartBarcode || item.sparepartId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <RiUserLine className="size-3.5" />
                          <span className="max-w-32 truncate">{item.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                          +{item.addedQty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(item.purchasePrice)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(item.totalPrice)}</TableCell>
                      <TableCell>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground tabular-nums">
                          {item.previousStock} → {item.newStock}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {history.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{item.sparepartName || "Sparepart"}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <RiBarcodeLine className="size-3" />
                        <span className="truncate">{item.sparepartBarcode || item.sparepartId}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                      +{item.addedQty}
                    </Badge>
                  </div>
                  <div className="grid gap-2 rounded-md bg-background/70 p-2 text-xs sm:grid-cols-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <RiCalendarLine className="size-3.5" />
                      {formatDate(new Date(item.createdAt))}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <RiUserLine className="size-3.5" />
                      {item.userName}
                    </div>
                    <div className="text-muted-foreground">Harga beli: <span className="text-foreground tabular-nums">{formatCurrency(item.purchasePrice)}</span></div>
                    <div className="text-muted-foreground">Stok: <span className="text-foreground tabular-nums">{item.previousStock} → {item.newStock}</span></div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-xs font-medium text-muted-foreground">Subtotal</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(item.totalPrice)}</span>
                  </div>
                </div>
              ))}
            </div>

            {history.totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
                <span className="text-xs text-muted-foreground">
                  Halaman {history.page} dari {history.totalPages}
                </span>
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      {history.page <= 1 ? (
                        <Button variant="outline" disabled>Sebelumnya</Button>
                      ) : (
                        <PaginationPrevious href={buildHistoryHref(tokoId, { ...filters, page: history.page - 1 })} text="Sebelumnya" />
                      )}
                    </PaginationItem>
                    <PaginationItem>
                      {history.page >= history.totalPages ? (
                        <Button variant="outline" disabled>Berikutnya</Button>
                      ) : (
                        <PaginationNext href={buildHistoryHref(tokoId, { ...filters, page: history.page + 1 })} text="Berikutnya" />
                      )}
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
