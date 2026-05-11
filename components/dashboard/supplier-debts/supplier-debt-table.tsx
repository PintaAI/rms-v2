"use client"

import { useMemo, useState, useTransition } from "react"
import { deleteSupplierDebt, type SupplierDebtListItem, type SupplierOption } from "@/actions/supplier-debts"
import { SupplierDebtFormDialog } from "@/components/dashboard/supplier-debts/supplier-debt-form-dialog"
import { SupplierPaymentDialog } from "@/components/dashboard/supplier-debts/supplier-payment-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiLoader4Line,
  RiMoneyDollarCircleLine,
  RiSearchLine,
} from "@remixicon/react"
import { toast } from "sonner"

interface SupplierDebtTableProps {
  tokoId: string
  initialDebts: SupplierDebtListItem[]
  initialSuppliers: SupplierOption[]
  readOnly?: boolean
}

const statusLabels: Record<SupplierDebtListItem["status"], string> = {
  unpaid: "Belum Dibayar",
  partial: "Sebagian",
  paid: "Lunas",
}

function isOverdue(debt: SupplierDebtListItem) {
  if (!debt.dueDate || debt.status === "paid") return false
  const dueDate = new Date(debt.dueDate)
  dueDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dueDate < today
}

function upsertDebt(debts: SupplierDebtListItem[], debt: SupplierDebtListItem) {
  return debts.some((item) => item.id === debt.id) ? debts.map((item) => (item.id === debt.id ? debt : item)) : [debt, ...debts]
}

export function SupplierDebtTable({ tokoId, initialDebts, initialSuppliers, readOnly = false }: SupplierDebtTableProps) {
  const [debts, setDebts] = useState(initialDebts)
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<SupplierDebtListItem | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payingDebt, setPayingDebt] = useState<SupplierDebtListItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingDebt, setDeletingDebt] = useState<SupplierDebtListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  const summary = useMemo(
    () => ({
      totalRemaining: debts.reduce((total, debt) => total + (debt.status === "paid" ? 0 : debt.remainingAmount), 0),
      totalPaid: debts.reduce((total, debt) => total + debt.paidAmount, 0),
      activeCount: debts.filter((debt) => debt.status !== "paid" && debt.remainingAmount > 0).length,
      overdueCount: debts.filter(isOverdue).length,
    }),
    [debts]
  )

  const filteredDebts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return debts
    return debts.filter(
      (debt) =>
        debt.supplierName.toLowerCase().includes(normalizedSearch) ||
        (debt.invoiceNumber?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (debt.description?.toLowerCase().includes(normalizedSearch) ?? false)
    )
  }, [debts, search])

  function handleSavedDebt(debt: SupplierDebtListItem, supplier?: SupplierOption) {
    setDebts((prev) => upsertDebt(prev, debt))
    if (supplier) setSuppliers((prev) => (prev.some((item) => item.id === supplier.id) ? prev : [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name))))
    setEditingDebt(null)
    toast.success("Hutang supplier disimpan")
  }

  function handleSavedPayment(debt: SupplierDebtListItem) {
    setDebts((prev) => upsertDebt(prev, debt))
    setPayingDebt(null)
    toast.success("Pembayaran disimpan")
  }

  function handleDelete() {
    if (!deletingDebt) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteSupplierDebt(deletingDebt.id)
      if (!result.success) {
        setDeleteError(result.error || "Gagal menghapus hutang supplier")
        return
      }
      setDebts((prev) => prev.filter((debt) => debt.id !== deletingDebt.id))
      setDeleteOpen(false)
      setDeletingDebt(null)
      toast.success("Hutang supplier dihapus")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Daftar Hutang</h2>
        </div>
        {!readOnly ? (
          <Button
            onClick={() => {
              setEditingDebt(null)
              setFormOpen(true)
            }}
          >
            <RiAddLine data-icon="inline-start" />
            Tambah Hutang
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Sisa Hutang" value={formatCurrency(summary.totalRemaining)} description="Belum dibayar" />
        <SummaryCard title="Total Sudah Dibayar" value={formatCurrency(summary.totalPaid)} description="Akumulasi pembayaran" />
        <SummaryCard title="Nota Belum Lunas" value={String(summary.activeCount)} description="Masih punya sisa" />
        <SummaryCard title="Lewat Jatuh Tempo" value={String(summary.overdueCount)} description="Perlu ditindaklanjuti" />
      </div>

      <div className="relative">
        <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari supplier, no nota, atau keterangan..." className="pl-9" />
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>No Nota</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Dibayar</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-muted-foreground">
                      {search
                        ? "Tidak ada hutang supplier yang sesuai pencarian."
                        : "Belum ada hutang supplier. Tambahkan nota supplier yang belum lunas untuk mulai memantau kewajiban toko."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDebts.map((debt) => {
                    const overdue = isOverdue(debt)
                    return (
                      <TableRow key={debt.id}>
                        <TableCell className="font-medium">{debt.supplierName}</TableCell>
                        <TableCell>{debt.invoiceNumber || "-"}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{debt.description || "-"}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(debt.totalAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(debt.paidAmount)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(debt.remainingAmount)}</TableCell>
                        <TableCell>{formatDate(debt.dueDate)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={debt.status === "paid" ? "default" : debt.status === "partial" ? "secondary" : "outline"}>
                              {statusLabels[debt.status]}
                            </Badge>
                            {overdue ? <Badge variant="destructive">Lewat Tempo</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={readOnly || debt.status === "paid"}
                              onClick={() => {
                                setPayingDebt(debt)
                                setPaymentOpen(true)
                              }}
                            >
                              <RiMoneyDollarCircleLine />
                              <span className="sr-only">Tambah pembayaran</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={readOnly}
                              onClick={() => {
                                setEditingDebt(debt)
                                setFormOpen(true)
                              }}
                            >
                              <RiEditLine />
                              <span className="sr-only">Edit hutang</span>
                            </Button>
                            {debt.paymentCount === 0 ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={readOnly}
                                onClick={() => {
                                  setDeletingDebt(debt)
                                  setDeleteError(null)
                                  setDeleteOpen(true)
                                }}
                              >
                                <RiDeleteBinLine className="text-destructive" />
                                <span className="sr-only">Hapus hutang</span>
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SupplierDebtFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tokoId={tokoId}
        suppliers={suppliers}
        debt={editingDebt}
        onSaved={handleSavedDebt}
      />

      <SupplierPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} debt={payingDebt} onSaved={handleSavedPayment} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Hutang Supplier</DialogTitle>
            <DialogDescription>
              Hapus nota {deletingDebt?.invoiceNumber || deletingDebt?.supplierName}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <RiLoader4Line data-icon="inline-start" className="animate-spin" /> : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tracking-tight tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
