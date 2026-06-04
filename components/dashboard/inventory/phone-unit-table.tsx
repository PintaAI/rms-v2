"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  getInventoryUnits,
  deleteInventoryUnit,
  searchInventoryUnitByImei,
  type InventoryUnitItem,
  type InventoryUnitCondition,
  type InventoryUnitStatus,
} from "@/actions/inventory-unit";
import { PhoneUnitFormDialog } from "@/components/dashboard/inventory/phone-unit-form-dialog";
import { cn, formatCurrency } from "@/lib/utils";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiLoader4Line,
  RiSearchLine,
  RiSmartphoneLine,
  RiHistoryLine,
} from "@remixicon/react";

const CONDITION_LABELS: Record<InventoryUnitCondition, string> = {
  new: "Baru",
  used_good: "Bekas (Baik)",
  used_fair: "Bekas (Cukup)",
  refurbished: "Refurbished",
  damaged: "Rusak",
};

const STATUS_LABELS: Record<InventoryUnitStatus, { label: string; color: string }> = {
  available: { label: "Tersedia", color: "bg-green-500" },
  reserved: { label: "Reserved", color: "bg-yellow-500" },
  sold: { label: "Sold", color: "bg-blue-500" },
  returned: { label: "Returned", color: "bg-orange-500" },
  defective: { label: "Defective", color: "bg-red-500" },
};

interface PhoneUnitTableProps {
  tokoId: string;
  readOnly?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function PhoneUnitTable({
  tokoId,
  readOnly = false,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: PhoneUnitTableProps) {
  const [units, setUnits] = useState<InventoryUnitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryUnitStatus | "all">("all");
  const [conditionFilter, setConditionFilter] = useState<InventoryUnitCondition | "all">("all");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<InventoryUnitItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<InventoryUnitItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUnits = useCallback(async () => {
    setIsLoading(true);
    const result = await getInventoryUnits(tokoId, {
      q: searchQuery,
      status: statusFilter,
      condition: conditionFilter,
      page,
      pageSize: 20,
    });
    if (result.success && result.data) {
      setUnits(result.data.items);
      setTotalItems(result.data.totalItems);
      setTotalPages(result.data.totalPages);
    }
    setIsLoading(false);
  }, [tokoId, searchQuery, statusFilter, conditionFilter, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUnits(), 0);
    return () => window.clearTimeout(timer);
  }, [loadUnits]);

  const handleAdd = () => {
    setEditingUnit(null);
    setDialogOpen(true);
  };

  const handleEdit = (unit: InventoryUnitItem) => {
    setEditingUnit(unit);
    setDialogOpen(true);
  };

  const handleSuccess = (newUnit?: InventoryUnitItem) => {
    if (newUnit) {
      if (editingUnit) {
        setUnits((prev) => prev.map((u) => (u.id === newUnit.id ? newUnit : u)));
      } else {
        setUnits((prev) => [newUnit, ...prev]);
        setTotalItems((prev) => prev + 1);
      }
    }
    setEditingUnit(null);
  };

  const handleDeleteClick = (unit: InventoryUnitItem) => {
    setDeletingUnit(unit);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUnit) return;
    setIsDeleting(true);
    const result = await deleteInventoryUnit(tokoId, deletingUnit.id);
    setIsDeleting(false);
    if (result.success) {
      setUnits((prev) => prev.filter((u) => u.id !== deletingUnit.id));
      setTotalItems((prev) => prev - 1);
    }
    setDeleteDialogOpen(false);
    setDeletingUnit(null);
  };

  const handleImeiSearch = async (imei: string) => {
    if (!imei.trim()) {
      void loadUnits();
      return;
    }
    setIsLoading(true);
    const result = await searchInventoryUnitByImei(tokoId, imei.trim());
    if (result.success && result.data) {
      setUnits([result.data]);
      setTotalItems(1);
      setTotalPages(1);
    } else {
      setUnits([]);
      setTotalItems(0);
      setTotalPages(1);
    }
    setIsLoading(false);
  };

  const canMutate = canCreate || canUpdate || canDelete;
  const hasRowActions = canUpdate || canDelete;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 bg-primary rounded-full" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            Unit Phone {!canMutate && <span className="text-muted-foreground/60">(Hanya Baca)</span>}
          </h2>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Button asChild variant="outline" className="flex-1 sm:flex-none">
            <Link href={`/${tokoId}/inventory/restock-history`}>
              <RiHistoryLine className="h-4 w-4 mr-1.5" />
              Riwayat
            </Link>
          </Button>
          {canCreate && (
            <Button
              onClick={handleAdd}
              className="flex-1 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:from-primary/90 hover:to-primary/80 hover:shadow-xl hover:shadow-primary/30 sm:flex-none"
            >
              <RiAddLine className="h-4 w-4 mr-1.5" />
              Tambah Unit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (searchQuery.length >= 10 && /^\d+$/.test(searchQuery)) {
                  void handleImeiSearch(searchQuery);
                } else {
                  void loadUnits();
                }
              }
            }}
            placeholder="Cari IMEI, brand, atau model..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InventoryUnitStatus | "all")}>
          <SelectTrigger className="h-9 w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={conditionFilter} onValueChange={(v) => setConditionFilter(v as InventoryUnitCondition | "all")}>
          <SelectTrigger className="h-9 w-full sm:w-[140px]">
            <SelectValue placeholder="Kondisi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kondisi</SelectItem>
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="p-8 flex items-center justify-center">
          <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : units.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          {searchQuery
            ? "Tidak ditemukan unit sesuai pencarian"
            : "Belum ada unit phone. Klik \"Tambah Unit\" untuk menambahkan."}
        </div>
      ) : (
        <Card className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[850px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Perangkat</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">IMEI</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Kondisi</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Harga Beli</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Harga Jual</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Garansi</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Ditambahkan</TableHead>
                    {hasRowActions && <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest w-[80px]">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => {
                    const statusInfo = STATUS_LABELS[unit.status];
                    return (
                      <TableRow key={unit.id} className="border-border/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                              <RiSmartphoneLine className="size-4 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{unit.deviceBrandName}</span>
                              <span className="text-xs text-muted-foreground">{unit.deviceModelName}</span>
                              {unit.categoryName ? <span className="text-xs font-medium text-primary">{unit.categoryName}</span> : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{unit.imei || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                            unit.condition === "new" && "bg-green-100 text-green-800",
                            unit.condition === "used_good" && "bg-blue-100 text-blue-800",
                            unit.condition === "used_fair" && "bg-yellow-100 text-yellow-800",
                            unit.condition === "refurbished" && "bg-purple-100 text-purple-800",
                            unit.condition === "damaged" && "bg-red-100 text-red-800",
                          )}>
                            {CONDITION_LABELS[unit.condition]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", statusInfo.color)} />
                            <span className="text-sm">{statusInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(unit.purchasePrice)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(unit.sellingPrice)}</TableCell>
                        <TableCell>
                          {unit.warrantyDays ? `${unit.warrantyDays} hari` : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(unit.acquiredAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        {hasRowActions && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {canUpdate && unit.status !== "sold" && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleEdit(unit)}
                                >
                                  <RiEditLine className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && unit.status !== "sold" && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDeleteClick(unit)}
                                >
                                  <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {totalItems} unit
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground py-1.5 px-3">
              Halaman {page} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {(canCreate || canUpdate) && (
        <PhoneUnitFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          unit={editingUnit}
          tokoId={tokoId}
          onSuccess={handleSuccess}
        />
      )}

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Unit Phone"
        description={`Apakah Anda yakin ingin menghapus unit "${deletingUnit?.deviceBrandName} ${deletingUnit?.deviceModelName}" (${deletingUnit?.imei || "no IMEI"})? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
