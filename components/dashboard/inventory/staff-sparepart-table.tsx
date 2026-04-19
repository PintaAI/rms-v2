"use client";

import { useState, useCallback, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import {
  getSpareparts,
  deleteSparepart,
  type SparepartWithCompatibilities,
} from "@/actions/inventory";
import { SparepartFormDialog } from "@/components/dashboard/sparepart-form-dialog";
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiSearchLine,
} from "@remixicon/react";

interface StaffSparepartTableProps {
  tokoId: string;
}

export function StaffSparepartTable({ tokoId }: StaffSparepartTableProps) {
  const [spareparts, setSpareparts] = useState<SparepartWithCompatibilities[]>([]);
  const [sparepartSearch, setSparepartSearch] = useState("");
  const [isLoadingSpareparts, setIsLoadingSpareparts] = useState(true);

  const [sparepartDialogOpen, setSparepartDialogOpen] = useState(false);
  const [editingSparepart, setEditingSparepart] = useState<SparepartWithCompatibilities | null>(null);

  const [deleteSparepartDialogOpen, setDeleteSparepartDialogOpen] = useState(false);
  const [deletingSparepart, setDeletingSparepart] = useState<SparepartWithCompatibilities | null>(null);
  const [isDeletingSparepart, setIsDeletingSparepart] = useState(false);

  const loadSpareparts = useCallback(async () => {
    setIsLoadingSpareparts(true);
    const result = await getSpareparts(tokoId);
    if (result.success && result.data) {
      setSpareparts(result.data);
    }
    setIsLoadingSpareparts(false);
  }, [tokoId]);

  useEffect(() => {
    loadSpareparts();
  }, [loadSpareparts]);

  const filteredSpareparts = spareparts.filter((sp) =>
    sp.name.toLowerCase().includes(sparepartSearch.toLowerCase())
  );

  const handleAddSparepart = () => {
    setEditingSparepart(null);
    setSparepartDialogOpen(true);
  };

  const handleEditSparepart = (sparepart: SparepartWithCompatibilities) => {
    setEditingSparepart(sparepart);
    setSparepartDialogOpen(true);
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Sparepart</h2>
        <Button onClick={handleAddSparepart}>
          <RiAddLine className="size-4" />
          Add Sparepart
        </Button>
      </div>

      <div className="relative">
        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={sparepartSearch}
          onChange={(e) => setSparepartSearch(e.target.value)}
          placeholder="Search spareparts..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoadingSpareparts ? (
            <div className="p-8 flex items-center justify-center">
              <RiLoader4Line className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Compatibility</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpareparts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {sparepartSearch
                        ? "No spareparts found matching your search"
                        : "No spareparts yet. Click \"Add Sparepart\" to add one."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSpareparts.map((sparepart) => (
                    <TableRow key={sparepart.id}>
                      <TableCell className="font-medium">{sparepart.name}</TableCell>
                      <TableCell>{formatPrice(sparepart.defaultPrice)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            sparepart.stock <= 0
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200"
                              : sparepart.stock <= 5
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200"
                              : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200"
                          }
                        >
                          {sparepart.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sparepart.isUniversal ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Universal
                          </Badge>
                        ) : sparepart.compatibilities.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {sparepart.compatibilities.slice(0, 3).map((c) => (
                              <Badge key={c.hpCatalogId} variant="outline" className="text-xs">
                                {c.hpCatalog.brand.name} {c.hpCatalog.modelName}
                              </Badge>
                            ))}
                            {sparepart.compatibilities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{sparepart.compatibilities.length - 3} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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

      <DeleteDialog
        open={deleteSparepartDialogOpen}
        onOpenChange={setDeleteSparepartDialogOpen}
        title="Delete Sparepart"
        description={`Are you sure you want to delete "${deletingSparepart?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteSparepartConfirm}
        isLoading={isDeletingSparepart}
      />
    </div>
  );
}