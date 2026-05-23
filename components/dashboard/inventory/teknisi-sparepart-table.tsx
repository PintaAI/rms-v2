"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getInventoryItems, type InventoryItemWithCompatibilities } from "@/actions/inventory";
import {
  RiLoader4Line,
  RiSearchLine,
} from "@remixicon/react";
import { formatCurrency } from "@/lib/utils";
import { SparepartStockBadge } from "@/components/dashboard/inventory/sparepart-stock-badge";
import { SparepartCompatibilityCell } from "@/components/dashboard/inventory/sparepart-compatibility-cell";

interface TeknisiSparepartTableProps {
  tokoId: string;
  initialSearchQuery?: string;
}

export function TeknisiSparepartTable({ tokoId, initialSearchQuery = "" }: TeknisiSparepartTableProps) {
  const [spareparts, setSpareparts] = useState<InventoryItemWithCompatibilities[]>([]);
  const [sparepartSearch, setSparepartSearch] = useState(initialSearchQuery);
  const [isLoadingSpareparts, setIsLoadingSpareparts] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoadingSpareparts(true);
      const result = await getInventoryItems(tokoId, "repair_part");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Sparepart</h2>
        <Badge variant="outline" className="text-muted-foreground">
          (Hanya Baca)
        </Badge>
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
                  <TableHead>Nama</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Kompatibilitas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpareparts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        {sparepartSearch
                          ? "Tidak ditemukan sparepart sesuai pencarian"
                          : "Tidak ada sparepart tersedia"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSpareparts.map((sparepart) => (
                    <TableRow key={sparepart.id}>
                      <TableCell className="font-medium">{sparepart.name}</TableCell>
                      <TableCell>{formatCurrency(sparepart.defaultPrice)}</TableCell>
                      <TableCell>
                        <SparepartStockBadge sparepart={sparepart} showLabel={false} />
                      </TableCell>
                      <TableCell>
                        <SparepartCompatibilityCell sparepart={sparepart} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
