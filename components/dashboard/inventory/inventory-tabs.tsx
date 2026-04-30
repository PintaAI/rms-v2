"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
  getServicePricelists,
  deleteSparepart,
  deleteServicePricelist,
  type SparepartWithCompatibilities,
  type ServicePricelist,
} from "@/actions/inventory";
import { SparepartFormDialog } from "@/components/dashboard/inventory/sparepart-form-dialog";
import { SparepartLabelPrintDialog } from "@/components/dashboard/inventory/sparepart-label-print-dialog";
import { ServicePricelistFormDialog } from "@/components/dashboard/inventory/service-pricelist-form-dialog";
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiSearchLine,
  RiArchiveLine,
  RiPriceTag3Line,
  RiListCheck,
  RiGridFill,
  RiPrinterLine,
} from "@remixicon/react";
import { cn, formatCurrency } from "@/lib/utils";

type ViewMode = "table" | "card";

interface InventoryTabsProps {
  tokoId: string;
  readOnly?: boolean;
}

export function InventoryTabs({ tokoId, readOnly = false }: InventoryTabsProps) {
  const [spareparts, setSpareparts] = useState<SparepartWithCompatibilities[]>([]);
  const [pricelists, setPricelists] = useState<ServicePricelist[]>([]);
  const [sparepartSearch, setSparepartSearch] = useState("");
  const [pricelistSearch, setPricelistSearch] = useState("");
  const [isLoadingSpareparts, setIsLoadingSpareparts] = useState(true);
  const [isLoadingPricelists, setIsLoadingPricelists] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const [sparepartDialogOpen, setSparepartDialogOpen] = useState(false);
  const [pricelistDialogOpen, setPricelistDialogOpen] = useState(false);
  const [editingSparepart, setEditingSparepart] = useState<SparepartWithCompatibilities | null>(null);
  const [editingPricelist, setEditingPricelist] = useState<ServicePricelist | null>(null);

  const [deleteSparepartDialogOpen, setDeleteSparepartDialogOpen] = useState(false);
  const [deletePricelistDialogOpen, setDeletePricelistDialogOpen] = useState(false);
  const [deletingSparepart, setDeletingSparepart] = useState<SparepartWithCompatibilities | null>(null);
  const [deletingPricelist, setDeletingPricelist] = useState<ServicePricelist | null>(null);
  const [isDeletingSparepart, setIsDeletingSparepart] = useState(false);
  const [isDeletingPricelist, setIsDeletingPricelist] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [printingSparepart, setPrintingSparepart] = useState<SparepartWithCompatibilities | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoadingSpareparts(true);
      setIsLoadingPricelists(true);

      const [sparepartsResult, pricelistsResult] = await Promise.all([
        getSpareparts(tokoId),
        getServicePricelists(tokoId),
      ]);

      if (!active) return;

      if (sparepartsResult.success && sparepartsResult.data) {
        setSpareparts(sparepartsResult.data);
      }
      if (pricelistsResult.success && pricelistsResult.data) {
        setPricelists(pricelistsResult.data);
      }

      setIsLoadingSpareparts(false);
      setIsLoadingPricelists(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [tokoId]);

  const filteredSpareparts = spareparts.filter((sp) =>
    sp.name.toLowerCase().includes(sparepartSearch.toLowerCase())
  );

  const filteredPricelists = pricelists.filter((pl) =>
    pl.title.toLowerCase().includes(pricelistSearch.toLowerCase())
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

  const handleAddPricelist = () => {
    setEditingPricelist(null);
    setPricelistDialogOpen(true);
  };

  const handleEditPricelist = (pricelist: ServicePricelist) => {
    setEditingPricelist(pricelist);
    setPricelistDialogOpen(true);
  };

  const handlePricelistSuccess = (newPricelist?: ServicePricelist) => {
    if (newPricelist) {
      if (editingPricelist) {
        setPricelists((prev) =>
          prev.map((pl) => (pl.id === newPricelist.id ? newPricelist : pl))
        );
      } else {
        setPricelists((prev) => [...prev, newPricelist]);
      }
    }
    setEditingPricelist(null);
  };

  const handleDeletePricelistClick = (pricelist: ServicePricelist) => {
    setDeletingPricelist(pricelist);
    setDeletePricelistDialogOpen(true);
  };

  const handleDeletePricelistConfirm = async () => {
    if (!deletingPricelist) return;
    setIsDeletingPricelist(true);
    const result = await deleteServicePricelist(deletingPricelist.id);
    setIsDeletingPricelist(false);
    if (result.success) {
      setPricelists((prev) => prev.filter((pl) => pl.id !== deletingPricelist.id));
    }
    setDeletePricelistDialogOpen(false);
    setDeletingPricelist(null);
  };

  return (
    <Tabs defaultValue="sparepart" className="w-full">
      <TabsList className={cn("mb-4")}>
        <TabsTrigger value="sparepart" className="gap-1.5">
          <RiArchiveLine className="h-4 w-4" />
          Sparepart
        </TabsTrigger>
        <TabsTrigger value="jasa" className="gap-1.5">
          <RiPriceTag3Line className="h-4 w-4" />
          Jasa
        </TabsTrigger>
      </TabsList>

      <TabsContent value="sparepart">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-primary rounded-full" />
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Sparepart {readOnly && <span className="text-muted-foreground/60">(Read-only)</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <ButtonGroup>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => setViewMode("table")}
                  aria-pressed={viewMode === "table"}
                >
                  <RiListCheck className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === "card" ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => setViewMode("card")}
                  aria-pressed={viewMode === "card"}
                >
                  <RiGridFill className="h-3.5 w-3.5" />
                </Button>
              </ButtonGroup>
              {!readOnly && (
                <Button
                  onClick={handleAddSparepart}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
                >
                  <RiAddLine className="h-4 w-4 mr-1.5" />
                  Add Sparepart
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={sparepartSearch}
              onChange={(e) => setSparepartSearch(e.target.value)}
              placeholder="Search spareparts..."
              className="pl-9"
            />
          </div>

          {isLoadingSpareparts ? (
            <div className="p-8 flex items-center justify-center">
              <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "card" ? (
            filteredSpareparts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {sparepartSearch
                  ? "No spareparts found matching your search"
                  : "No spareparts yet. Click \"Add Sparepart\" to add one."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSpareparts.map((sparepart) => {
                  const stockVariant = sparepart.stock <= 0 ? "warning" : sparepart.stock <= 5 ? "accent" : "success";
                  const bgStyles: Record<string, string> = {
                    default: "bg-card",
                    success: "bg-gradient-to-br from-chart-1/5 via-card to-chart-1/[0.02]",
                    accent: "bg-gradient-to-br from-primary/5 via-card to-primary/[0.02]",
                    warning: "bg-gradient-to-br from-destructive/5 via-card to-destructive/[0.02]",
                  };
                  const accentColors: Record<string, string> = {
                    default: "bg-border",
                    success: "bg-chart-1",
                    accent: "bg-sky-500",
                    warning: "bg-destructive",
                  };
                  const iconBgStyles: Record<string, string> = {
                    default: "bg-muted",
                    success: "bg-chart-1/10",
                    accent: "bg-primary/10",
                    warning: "bg-destructive/10",
                  };

                  return (
                    <div
                      key={sparepart.id}
                      className={`relative ${bgStyles[stockVariant]} rounded-xl border border-border/50 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 hover:border-border/80`}
                    >
                      <div className={`absolute top-0 left-0 w-1 h-full ${accentColors[stockVariant]} transition-all duration-300 opacity-80 group-hover:w-1.5 group-hover:opacity-100`} />
                      <div className={`absolute top-3 right-3 w-8 h-8 rounded-md ${iconBgStyles[stockVariant]} flex items-center justify-center transition-all duration-300 group-hover:scale-115 group-hover:rounded-lg`}>
                        <RiArchiveLine className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className={`absolute top-0 right-0 w-20 h-20 ${accentColors[stockVariant]}/5 rounded-full blur-2xl transition-all duration-300 group-hover:w-28 group-hover:h-28 group-hover:opacity-80`} />
                      <div className="pl-5 pr-4 pt-5 pb-5 relative z-10">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Sparepart</p>
                        <div className="mt-2 text-lg font-bold tracking-tight text-foreground truncate transition-transform duration-300 group-hover:scale-[1.02]">{sparepart.name}</div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Price</span>
                            <span className="font-semibold text-sm tabular-nums">{formatCurrency(sparepart.defaultPrice)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Stock</span>
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
                          </div>
                          <div className="pt-2">
                            <span className="text-xs text-muted-foreground">Compatibility</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sparepart.isUniversal ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-xs">
                                  Universal
                                </Badge>
                              ) : sparepart.compatibilities.length > 0 ? (
                                <>
                                  {sparepart.compatibilities.slice(0, 2).map((c) => (
                                    <Badge key={c.hpCatalogId} variant="outline" className="text-xs">
                                      {c.hpCatalog.brand.name} {c.hpCatalog.modelName}
                                    </Badge>
                                  ))}
                                  {sparepart.compatibilities.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{sparepart.compatibilities.length - 2}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!readOnly && (
                          <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-border/50">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handlePrintSparepartLabel(sparepart)}
                            >
                              <RiPrinterLine className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEditSparepart(sparepart)}
                            >
                              <RiEditLine className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteSparepartClick(sparepart)}
                            >
                              <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className={`absolute bottom-0 left-0 right-0 h-px ${accentColors[stockVariant]}/20 transition-all duration-300 group-hover:h-0.5 group-hover:opacity-40`} />
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <Card className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Name</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Price</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Stock</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Compatibility</TableHead>
                      {!readOnly && <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest w-[112px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpareparts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={readOnly ? 4 : 5} className="h-24 text-center text-muted-foreground">
                          {sparepartSearch
                            ? "No spareparts found matching your search"
                            : "No spareparts yet. Click \"Add Sparepart\" to add one."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSpareparts.map((sparepart) => (
                        <TableRow key={sparepart.id} className="border-border/50">
                          <TableCell className="font-medium">{sparepart.name}</TableCell>
                          <TableCell>{formatCurrency(sparepart.defaultPrice)}</TableCell>
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
                          {!readOnly && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handlePrintSparepartLabel(sparepart)}
                                >
                                  <RiPrinterLine className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleEditSparepart(sparepart)}
                                >
                                  <RiEditLine className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDeleteSparepartClick(sparepart)}
                                >
                                  <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {!readOnly && (
          <SparepartFormDialog
            open={sparepartDialogOpen}
            onOpenChange={setSparepartDialogOpen}
            sparepart={editingSparepart}
            tokoId={tokoId}
            onSuccess={handleSparepartSuccess}
          />
        )}

        {!readOnly && (
          <SparepartLabelPrintDialog
            open={labelDialogOpen}
            onOpenChange={setLabelDialogOpen}
            sparepart={printingSparepart}
          />
        )}

        <DeleteDialog
          open={deleteSparepartDialogOpen}
          onOpenChange={setDeleteSparepartDialogOpen}
          title="Delete Sparepart"
          description={`Are you sure you want to delete "${deletingSparepart?.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteSparepartConfirm}
          isLoading={isDeletingSparepart}
        />
      </TabsContent>

      <TabsContent value="jasa">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-chart-1 rounded-full" />
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Jasa Service {readOnly && <span className="text-muted-foreground/60">(Read-only)</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <ButtonGroup>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => setViewMode("table")}
                  aria-pressed={viewMode === "table"}
                >
                  <RiListCheck className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === "card" ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => setViewMode("card")}
                  aria-pressed={viewMode === "card"}
                >
                  <RiGridFill className="h-3.5 w-3.5" />
                </Button>
              </ButtonGroup>
              {!readOnly && (
                <Button
                  onClick={handleAddPricelist}
                  className="bg-gradient-to-r from-chart-1 to-chart-1/90 hover:from-chart-1/90 hover:to-chart-1/80 shadow-lg shadow-chart-1/20 transition-all duration-200 hover:shadow-xl hover:shadow-chart-1/30"
                >
                  <RiAddLine className="h-4 w-4 mr-1.5" />
                  Add Jasa
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={pricelistSearch}
              onChange={(e) => setPricelistSearch(e.target.value)}
              placeholder="Search jasa..."
              className="pl-9"
            />
          </div>

          {isLoadingPricelists ? (
            <div className="p-8 flex items-center justify-center">
              <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "card" ? (
            filteredPricelists.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {pricelistSearch
                  ? "No jasa found matching your search"
                  : "No jasa yet. Click \"Add Jasa\" to add one."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPricelists.map((pricelist) => (
                  <div
                    key={pricelist.id}
                    className={`relative bg-gradient-to-br from-chart-1/5 via-card to-chart-1/[0.02] rounded-xl border border-border/50 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 hover:border-border/80`}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-chart-1 transition-all duration-300 opacity-80 group-hover:w-1.5 group-hover:opacity-100" />
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-md bg-chart-1/10 flex items-center justify-center transition-all duration-300 group-hover:scale-115 group-hover:rounded-lg">
                      <RiPriceTag3Line className="h-4 w-4 text-chart-1" />
                    </div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-chart-1/5 rounded-full blur-2xl transition-all duration-300 group-hover:w-28 group-hover:h-28 group-hover:opacity-80" />
                    <div className="pl-5 pr-4 pt-5 pb-5 relative z-10">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Jasa Service</p>
                      <div className="mt-2 text-lg font-bold tracking-tight text-foreground truncate transition-transform duration-300 group-hover:scale-[1.02]">{pricelist.title}</div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Price</span>
                        <span className="font-semibold text-sm tabular-nums">{formatCurrency(pricelist.defaultPrice)}</span>
                      </div>
                      {!readOnly && (
                        <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-border/50">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEditPricelist(pricelist)}
                          >
                            <RiEditLine className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeletePricelistClick(pricelist)}
                          >
                            <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-chart-1/20 transition-all duration-300 group-hover:h-0.5 group-hover:opacity-40" />
                  </div>
                ))}
              </div>
            )
          ) : (
            <Card className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Title</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Default Price</TableHead>
                      {!readOnly && <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest w-[80px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPricelists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={readOnly ? 2 : 3} className="h-24 text-center text-muted-foreground">
                          {pricelistSearch
                            ? "No jasa found matching your search"
                            : "No jasa yet. Click \"Add Jasa\" to add one."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPricelists.map((pricelist) => (
                        <TableRow key={pricelist.id} className="border-border/50">
                          <TableCell className="font-medium">{pricelist.title}</TableCell>
                          <TableCell>{formatCurrency(pricelist.defaultPrice)}</TableCell>
                          {!readOnly && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleEditPricelist(pricelist)}
                                >
                                  <RiEditLine className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDeletePricelistClick(pricelist)}
                                >
                                  <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {!readOnly && (
          <ServicePricelistFormDialog
            open={pricelistDialogOpen}
            onOpenChange={setPricelistDialogOpen}
            pricelist={editingPricelist}
            tokoId={tokoId}
            onSuccess={handlePricelistSuccess}
          />
        )}

        <DeleteDialog
          open={deletePricelistDialogOpen}
          onOpenChange={setDeletePricelistDialogOpen}
          title="Delete Jasa"
          description={`Are you sure you want to delete "${deletingPricelist?.title}"? This action cannot be undone.`}
          onConfirm={handleDeletePricelistConfirm}
          isLoading={isDeletingPricelist}
        />
      </TabsContent>
    </Tabs>
  );
}
