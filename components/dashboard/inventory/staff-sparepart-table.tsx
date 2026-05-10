"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  getSpareparts,
  deleteSparepart,
  type SparepartWithCompatibilities,
} from "@/actions/inventory";
import { SparepartFormDialog } from "@/components/dashboard/inventory/sparepart-form-dialog";
import { SparepartLabelPrintDialog } from "@/components/dashboard/inventory/sparepart-label-print-dialog";
import { SparepartStockBadge } from "@/components/dashboard/inventory/sparepart-stock-badge";
import { SparepartCompatibilityCell } from "@/components/dashboard/inventory/sparepart-compatibility-cell";
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiSearchLine,
  RiPrinterLine,
} from "@remixicon/react";
import { formatCurrency } from "@/lib/utils";

interface StaffSparepartTableProps {
  tokoId: string;
  initialSearchQuery?: string;
}

export function StaffSparepartTable({ tokoId, initialSearchQuery = "" }: StaffSparepartTableProps) {
  const [spareparts, setSpareparts] = useState<SparepartWithCompatibilities[]>([]);
  const [sparepartSearch, setSparepartSearch] = useState(initialSearchQuery);
  const [isLoadingSpareparts, setIsLoadingSpareparts] = useState(true);

  const [sparepartDialogOpen, setSparepartDialogOpen] = useState(false);
  const [editingSparepart, setEditingSparepart] = useState<SparepartWithCompatibilities | null>(null);

  const [deleteSparepartDialogOpen, setDeleteSparepartDialogOpen] = useState(false);
  const [deletingSparepart, setDeletingSparepart] = useState<SparepartWithCompatibilities | null>(null);
  const [isDeletingSparepart, setIsDeletingSparepart] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [printingSparepart, setPrintingSparepart] = useState<SparepartWithCompatibilities | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoadingSpareparts(true);
      const result = await getSpareparts(tokoId);
      if (!active) return;
      if (result.success && result.data) {
        setSpareparts(result.data);
      }
      setIsLoadingSpareparts(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [tokoId]);

  const normalizedSparepartSearch = sparepartSearch.toLowerCase();
  const filteredSpareparts = spareparts.filter(
    (sp) =>
      sp.name.toLowerCase().includes(normalizedSparepartSearch) ||
      sp.barcode.toLowerCase().includes(normalizedSparepartSearch)
  );

  const handleAddSparepart = () => {
    setEditingSparepart(null);
    setSparepartDialogOpen(true);
  };

  const handleEditSparepart = (sparepart: SparepartWithCompatibilities) => {
    setEditingSparepart(sparepart);
    setSparepartDialogOpen(true);
  };

  const handlePrintSparepartLabel = (sparepart: SparepartWithCompatibilities) => {
    setPrintingSparepart(sparepart);
    setLabelDialogOpen(true);
  };

  const handleSparepartSuccess = (newSparepart?: SparepartWithCompatibilities) => {
    if (newSparepart) {
      if (editingSparepart) {
        setSpareparts((prev) =>
          prev.map((sp) => (sp.id === newSparepart.id ? newSparepart : sp))
        );
      } else {
        setSpareparts((prev) => [...prev, newSparepart]);
      }
    }
    setEditingSparepart(null);
  };

  const handleDeleteSparepartClick = (sparepart: SparepartWithCompatibilities) => {
    setDeletingSparepart(sparepart);
    setDeleteSparepartDialogOpen(true);
  };

  const handleDeleteSparepartConfirm = async () => {
    if (!deletingSparepart) return;
    setIsDeletingSparepart(true);
    const result = await deleteSparepart(deletingSparepart.id);
    setIsDeletingSparepart(false);
    if (result.success) {
      setSpareparts((prev) => prev.filter((sp) => sp.id !== deletingSparepart.id));
    }
    setDeleteSparepartDialogOpen(false);
    setDeletingSparepart(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Sparepart</h2>
        </div>
        <Button
          onClick={handleAddSparepart}
          className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:from-primary/90 hover:to-primary/80 hover:shadow-xl hover:shadow-primary/30"
        >
          <RiAddLine className="size-4 mr-1.5" />
          Tambah Barang
        </Button>
      </div>

      <div className="relative">
        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={sparepartSearch}
          onChange={(e) => setSparepartSearch(e.target.value)}
          placeholder="Cari sparepart..."
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden border-border/50 py-0 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
        <CardContent className="p-0">
          {isLoadingSpareparts ? (
            <div className="p-8 flex items-center justify-center">
              <RiLoader4Line className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Kompatibilitas</TableHead>
                    <TableHead className="w-[132px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSpareparts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        {sparepartSearch
                          ? "Tidak ditemukan sparepart sesuai pencarian"
                          : "Belum ada sparepart. Klik \"Tambah Sparepart\" untuk menambahkan."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSpareparts.map((sparepart) => (
                      <TableRow key={sparepart.id}>
                        <TableCell className="font-medium">{sparepart.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Sparepart</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(sparepart.defaultPrice)}</TableCell>
                        <TableCell>
                          <SparepartStockBadge sparepart={sparepart} showLabel={false} />
                        </TableCell>
                        <TableCell>
                          <SparepartCompatibilityCell sparepart={sparepart} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handlePrintSparepartLabel(sparepart)}
                            >
                              <RiPrinterLine className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEditSparepart(sparepart)}
                            >
                              <RiEditLine className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteSparepartClick(sparepart)}
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

      <SparepartFormDialog
        open={sparepartDialogOpen}
        onOpenChange={setSparepartDialogOpen}
        sparepart={editingSparepart}
        tokoId={tokoId}
        onSuccess={handleSparepartSuccess}
      />

      <SparepartLabelPrintDialog
        open={labelDialogOpen}
        onOpenChange={setLabelDialogOpen}
        sparepart={printingSparepart}
      />

      <DeleteDialog
        open={deleteSparepartDialogOpen}
        onOpenChange={setDeleteSparepartDialogOpen}
        title="Hapus Sparepart"
        description={`Apakah Anda yakin ingin menghapus "${deletingSparepart?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteSparepartConfirm}
        isLoading={isDeletingSparepart}
      />
    </div>
  );
}
