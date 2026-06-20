"use client";

import { useEffect, useState } from "react";
import { deleteInventoryItem, getInventoryItems, type InventoryItemWithCompatibilities } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventoryItemFormDialog } from "@/components/dashboard/inventory/inventory-item-form-dialog";
import { SparepartImportDialog } from "@/components/dashboard/inventory/sparepart-import-dialog";
import { SparepartRestockDialog } from "@/components/dashboard/inventory/sparepart-restock-dialog";
import { SparepartStockBadge } from "@/components/dashboard/inventory/sparepart-stock-badge";
import { formatCurrency } from "@/lib/utils";
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiLoader4Line, RiSearchLine, RiStackLine, RiUpload2Line } from "@remixicon/react";
import { toast } from "sonner";

interface RetailItemTableProps {
  tokoId: string;
  initialSearchQuery?: string;
  initialItems?: InventoryItemWithCompatibilities[];
  readOnly?: boolean;
  canRestock?: boolean;
  canImport?: boolean;
}

export function RetailItemTable({ tokoId, initialSearchQuery = "", initialItems, readOnly = false, canRestock = !readOnly, canImport = !readOnly }: RetailItemTableProps) {
  const [items, setItems] = useState<InventoryItemWithCompatibilities[]>(initialItems ?? []);
  const [search, setSearch] = useState(initialSearchQuery);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(!initialItems);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemWithCompatibilities | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<InventoryItemWithCompatibilities | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (initialItems) return;

    let active = true;

    const load = async () => {
      setIsLoading(true);
      const result = await getInventoryItems(tokoId, "retail_product");
      if (!active) return;
      if (result.success && result.data) setItems(result.data);
      setIsLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [initialItems, tokoId]);

  const normalizedSearch = search.toLowerCase();
  const categories = Array.from(
    new Map(
      items
        .filter((item) => item.category)
        .map((item) => [item.category!.id, item.category!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const filteredItems = items.filter(
    (item) =>
      (categoryFilter === "all" || item.categoryId === categoryFilter) &&
      (item.name.toLowerCase().includes(normalizedSearch) ||
        item.barcode.toLowerCase().includes(normalizedSearch) ||
        (item.category?.name.toLowerCase().includes(normalizedSearch) ?? false) ||
        (item.supplierName?.toLowerCase().includes(normalizedSearch) ?? false))
  );

  const handleSuccess = (item?: InventoryItemWithCompatibilities) => {
    if (!item) return;
    setItems((prev) => {
      const exists = prev.some((existing) => existing.id === item.id);
      return exists ? prev.map((existing) => (existing.id === item.id ? item : existing)) : [...prev, item];
    });
    setEditingItem(null);
  };

  const handleImportSuccess = async () => {
    setIsLoading(true);
    const result = await getInventoryItems(tokoId, "retail_product");
    if (result.success && result.data) setItems(result.data);
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    const result = await deleteInventoryItem(deletingItem.id);
    setIsDeleting(false);
    if (result.success) {
      setItems((prev) => prev.filter((item) => item.id !== deletingItem.id));
      toast.success("Barang dihapus dari daftar. Riwayat lama tetap tersimpan jika item pernah dipakai.");
      setDeleteOpen(false);
      setDeletingItem(null);
      return;
    }
    toast.error(result.error ?? "Gagal menghapus barang");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Barang Retail</h2>
        </div>
        {!readOnly ? <div className="flex flex-wrap items-center gap-2">
          {canRestock && (
            <Button variant="outline" onClick={() => setRestockOpen(true)}>
              <RiStackLine className="mr-1.5 size-4" />
              Restock
            </Button>
          )}
          {canImport && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <RiUpload2Line className="mr-1.5 size-4" />
              Import Excel
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingItem(null);
              setFormOpen(true);
            }}
            className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:from-primary/90 hover:to-primary/80 hover:shadow-xl hover:shadow-primary/30"
          >
            <RiAddLine className="mr-1.5 size-4" />
            Tambah Barang Retail
          </Button>
        </div> : null}
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari barang retail..." className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Filter kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RiLoader4Line className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[840px]">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Harga Beli</TableHead>
                  <TableHead>Harga Jual</TableHead>
                  <TableHead>Garansi</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead className="w-[88px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      {search ? "Tidak ditemukan barang retail sesuai pencarian" : "Belum ada barang retail. Klik \"Tambah Barang Retail\" untuk menambahkan."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category?.name || "-"}</TableCell>
                      <TableCell>{item.supplierName || "-"}</TableCell>
                      <TableCell>{item.purchasePrice != null ? formatCurrency(item.purchasePrice) : "-"}</TableCell>
                      <TableCell>{formatCurrency(item.defaultPrice)}</TableCell>
                      <TableCell>{item.warrantyDays ? `${item.warrantyDays} hari` : "-"}</TableCell>
                      <TableCell>
                        <SparepartStockBadge sparepart={item} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={readOnly}
                            onClick={() => {
                              setEditingItem(item);
                              setFormOpen(true);
                            }}
                          >
                            <RiEditLine className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={readOnly}
                            onClick={() => {
                              setDeletingItem(item);
                              setDeleteOpen(true);
                            }}
                          >
                            <RiDeleteBinLine className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sparepart={editingItem}
        tokoId={tokoId}
        mode="retail_product"
        onSuccess={handleSuccess}
      />

      <SparepartRestockDialog
        open={restockOpen}
        onOpenChange={setRestockOpen}
        tokoId={tokoId}
        itemType="retail_product"
        onSuccess={handleSuccess}
      />

      <SparepartImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tokoId={tokoId}
        itemType="retail_product"
        onSuccess={handleImportSuccess}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus Barang Retail"
        description={`Apakah Anda yakin ingin menghapus "${deletingItem?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
