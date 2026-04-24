"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { RiLoader4Line, RiSearchLine, RiSave3Line } from "@remixicon/react"
import { mismatchReasonLabels, mismatchReasons, type InventoryAuditItem, type InventoryAuditItemStatus, type InventoryAuditMismatchReason } from "./types"

type FilterValue = "all" | InventoryAuditItemStatus

type AuditItemTableProps = {
  items: InventoryAuditItem[]
  savingItemId: string | null
  onSave: (input: {
    itemId: string
    physicalStock: number | null
    mismatchReason: InventoryAuditMismatchReason | null
    note: string | null
  }) => void
}

export function AuditItemTable({ items, savingItemId, onSave }: AuditItemTableProps) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<FilterValue>("all")
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          physicalStock: item.physicalStock?.toString() ?? "",
          mismatchReason: item.mismatchReason,
          note: item.note ?? "",
        },
      ])
    ) as Record<string, { physicalStock: string; mismatchReason: InventoryAuditMismatchReason | null; note: string }>
  )

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.sparepartName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = status === "all" || item.status === status
    return matchesSearch && matchesStatus
  })

  function updateDraft(itemId: string, draft: Partial<(typeof drafts)[string]>) {
    setDrafts((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...draft },
    }))
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-sm sm:flex-1">
            <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari sparepart..." className="pl-9" />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as FilterValue)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="pending">Belum dihitung</SelectItem>
              <SelectItem value="matched">Cocok</SelectItem>
              <SelectItem value="discrepancy">Mismatch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sparepart</TableHead>
              <TableHead className="text-right">Sistem</TableHead>
              <TableHead className="min-w-28">Fisik</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              const draft = drafts[item.id] ?? { physicalStock: "", mismatchReason: null, note: "" }
              const physicalStock = draft.physicalStock === "" ? null : Number(draft.physicalStock)
              const draftDifference = physicalStock === null ? item.difference : physicalStock - item.systemStock
              const needsReason = physicalStock !== null && draftDifference !== 0
              const isSaving = savingItemId === item.id

              return (
                <TableRow key={item.id}>
                  <TableCell className="min-w-48 whitespace-normal">
                    <div className="font-medium">{item.sparepartName}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant={item.status === "matched" ? "success" : item.status === "discrepancy" ? "warning" : "outline"}>
                        {item.status === "matched" ? "Cocok" : item.status === "discrepancy" ? "Mismatch" : "Pending"}
                      </Badge>
                      <Badge variant="outline">{formatCurrency(item.snapshotPrice)}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{item.systemStock}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={draft.physicalStock}
                      onChange={(event) => updateDraft(item.id, { physicalStock: event.target.value })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell className={draftDifference < 0 ? "text-right font-medium text-destructive" : draftDifference > 0 ? "text-right font-medium text-amber-600" : "text-right font-medium text-green-600"}>
                    {physicalStock === null ? "-" : draftDifference}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={draft.mismatchReason ?? "none"}
                      onValueChange={(value) => updateDraft(item.id, { mismatchReason: value === "none" ? null : (value as InventoryAuditMismatchReason) })}
                      disabled={!needsReason}
                    >
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="Pilih alasan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tidak perlu alasan</SelectItem>
                        {mismatchReasons.map((reason) => (
                          <SelectItem key={reason} value={reason}>{mismatchReasonLabels[reason]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input value={draft.note} onChange={(event) => updateDraft(item.id, { note: event.target.value })} placeholder="Opsional" className="w-52" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => onSave({
                        itemId: item.id,
                        physicalStock,
                        mismatchReason: needsReason ? draft.mismatchReason : null,
                        note: draft.note.trim() || null,
                      })}
                      disabled={isSaving || physicalStock === null || Number.isNaN(physicalStock) || (needsReason && !draft.mismatchReason)}
                    >
                      {isSaving ? <RiLoader4Line className="animate-spin" /> : <RiSave3Line />}
                      Simpan
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {filteredItems.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Tidak ada item sesuai filter.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
