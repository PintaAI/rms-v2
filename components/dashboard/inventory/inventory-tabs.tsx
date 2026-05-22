"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import {
  getInventoryItems,

  getServicePricelists,

  deleteInventoryItem,
  deleteServicePricelist,

  type InventoryItemWithCompatibilities,

  type ServicePricelist,
} from "@/actions/inventory";
import { SparepartFormDialog } from "@/components/dashboard/inventory/inventory-item-form-dialog";
import { SparepartLabelPrintDialog } from "@/components/dashboard/inventory/sparepart-label-print-dialog";
import { SparepartRestockDialog } from "@/components/dashboard/inventory/sparepart-restock-dialog";
import { SparepartImportDialog } from "@/components/dashboard/inventory/sparepart-import-dialog";
import { ServicePricelistFormDialog } from "@/components/dashboard/inventory/service-pricelist-form-dialog";
import { ServicePricelistImportDialog } from "@/components/dashboard/inventory/service-pricelist-import-dialog";
import { SparepartStockBadge, getSparepartStockVariant, type StockVariant } from "@/components/dashboard/inventory/sparepart-stock-badge";
import { SparepartCompatibilityCell } from "@/components/dashboard/inventory/sparepart-compatibility-cell";
import { RetailItemTable } from "@/components/dashboard/inventory/retail-item-table";
import { PhoneUnitTable } from "@/components/dashboard/inventory/phone-unit-table";
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
  RiStackLine,
  RiUpload2Line,
  RiHistoryLine,
  RiFilter3Line,
  RiCloseLine,
  RiShoppingBag3Line,
  RiSmartphoneLine,
} from "@remixicon/react";
import { cn, formatCurrency } from "@/lib/utils";

type ViewMode = "table" | "card";
type StockFilter = "all" | "critical" | "out" | "safe";

export type InventoryActionPermissions = {
  canViewInventory: boolean;
  canCreateSparepart: boolean;
  canUpdateSparepart: boolean;
  canDeleteSparepart: boolean;
  canRestockSparepart: boolean;
  canImportSparepart: boolean;
  canManageServicePricelists: boolean;
  canViewRestockHistory: boolean;
  canManageRetail: boolean;
  canManagePhoneUnits: boolean;
};

interface InventoryTabsProps {
  tokoId: string;
  readOnly?: boolean;
  initialSpareparts?: InventoryItemWithCompatibilities[];
  initialPricelists?: ServicePricelist[];
  initialTab?: "sparepart" | "jasa" | "retail" | "phone_unit";
  initialSearchQuery?: string;
  actionPermissions?: InventoryActionPermissions;
  showRestockHistoryLink?: boolean;
}

export function InventoryTabs({ tokoId, readOnly = false, initialSpareparts: _initialSpareparts, initialPricelists: _initialPricelists, initialTab = "sparepart", initialSearchQuery = "", actionPermissions, showRestockHistoryLink = !readOnly }: InventoryTabsProps) {
  const permissions = actionPermissions ?? {
    canViewInventory: !readOnly,
    canCreateSparepart: !readOnly,
    canUpdateSparepart: !readOnly,
    canDeleteSparepart: !readOnly,
    canRestockSparepart: !readOnly,
    canImportSparepart: !readOnly,
    canManageServicePricelists: !readOnly,
    canViewRestockHistory: !readOnly,
    canManageRetail: !readOnly,
    canManagePhoneUnits: !readOnly,
  };
  const resolvedInitialTab =
    initialTab === "retail" && permissions.canManageRetail
      ? "retail"
      : initialTab === "phone_unit" && permissions.canManagePhoneUnits
        ? "phone_unit"
        : initialTab === "jasa" && permissions.canViewInventory
          ? "jasa"
          : permissions.canViewInventory
            ? "sparepart"
            : permissions.canManagePhoneUnits
              ? "phone_unit"
              : "retail";

  const tabCount = [
    permissions.canViewInventory,
    permissions.canViewInventory,
    permissions.canManageRetail,
    permissions.canManagePhoneUnits,
  ].filter(Boolean).length;
  const tabListColumns = tabCount === 4
    ? "grid-cols-4"
    : tabCount === 3
      ? "grid-cols-3"
      : tabCount === 2
        ? "grid-cols-2"
        : "grid-cols-1";
  const hasSparepartRowActions = permissions.canUpdateSparepart || permissions.canDeleteSparepart;
  const hasAnySparepartMutation =
    permissions.canCreateSparepart ||
    permissions.canUpdateSparepart ||
    permissions.canDeleteSparepart ||
    permissions.canRestockSparepart ||
    permissions.canImportSparepart;
  const hasServicePricelistActions = permissions.canManageServicePricelists;
  const hasInitialData = _initialSpareparts !== undefined && _initialPricelists !== undefined;
  const [spareparts, setSpareparts] = useState<InventoryItemWithCompatibilities[]>(_initialSpareparts ?? []);
  const [pricelists, setPricelists] = useState<ServicePricelist[]>(_initialPricelists ?? []);
  const [activeTab, setActiveTab] = useState<"sparepart" | "jasa" | "retail" | "phone_unit">(resolvedInitialTab);
  const [sparepartSearch, setSparepartSearch] = useState(resolvedInitialTab === "sparepart" ? initialSearchQuery : "");
  const [sparepartCategoryFilter, setSparepartCategoryFilter] = useState("all");
  const [sparepartStockFilter, setSparepartStockFilter] = useState<StockFilter>("all");
  const [pricelistSearch, setPricelistSearch] = useState(resolvedInitialTab === "jasa" ? initialSearchQuery : "");
  const [isLoadingSpareparts, setIsLoadingSpareparts] = useState(!hasInitialData);
  const [isLoadingPricelists, setIsLoadingPricelists] = useState(!hasInitialData);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const [sparepartDialogOpen, setSparepartDialogOpen] = useState(false);
  const [pricelistDialogOpen, setPricelistDialogOpen] = useState(false);
  const [editingSparepart, setEditingSparepart] = useState<InventoryItemWithCompatibilities | null>(null);
  const [editingPricelist, setEditingPricelist] = useState<ServicePricelist | null>(null);

  const [deleteInventoryItemDialogOpen, setDeleteSparepartDialogOpen] = useState(false);
  const [deletePricelistDialogOpen, setDeletePricelistDialogOpen] = useState(false);
  const [deletingSparepart, setDeletingSparepart] = useState<InventoryItemWithCompatibilities | null>(null);
  const [deletingPricelist, setDeletingPricelist] = useState<ServicePricelist | null>(null);
  const [isDeletingSparepart, setIsDeletingSparepart] = useState(false);
  const [isDeletingPricelist, setIsDeletingPricelist] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [printingSparepart, setPrintingSparepart] = useState<InventoryItemWithCompatibilities | null>(null);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pricelistImportDialogOpen, setPricelistImportDialogOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    if (hasInitialData) return;

    let active = true;

    const load = async () => {
      setIsLoadingSpareparts(true);
      setIsLoadingPricelists(true);

      const [sparepartsResult, pricelistsResult] = await Promise.all([
        getInventoryItems(tokoId),
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
  }, [tokoId, hasInitialData]);

  const normalizedSparepartSearch = sparepartSearch.toLowerCase();
  const sparepartCategories = Array.from(
    new Map(
      spareparts
        .filter((sparepart) => sparepart.category)
        .map((sparepart) => [sparepart.category!.id, sparepart.category!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const filteredSpareparts = spareparts.filter(
    (sp) =>
      (sparepartCategoryFilter === "all" || sp.categoryId === sparepartCategoryFilter) &&
      (sparepartStockFilter === "all" ||
        (sparepartStockFilter === "critical" && sp.stock > 0 && sp.stock <= sp.criticalStock) ||
        (sparepartStockFilter === "out" && sp.stock <= 0) ||
        (sparepartStockFilter === "safe" && sp.stock > sp.criticalStock)) &&
      (sp.name.toLowerCase().includes(normalizedSparepartSearch) ||
        sp.barcode.toLowerCase().includes(normalizedSparepartSearch) ||
        (sp.supplierName?.toLowerCase().includes(normalizedSparepartSearch) ?? false) ||
        (sp.category?.name.toLowerCase().includes(normalizedSparepartSearch) ?? false))
  );

  const filteredPricelists = pricelists.filter((pl) =>
    pl.title.toLowerCase().includes(pricelistSearch.toLowerCase())
  );
  const activeSparepartFilterCount = Number(sparepartCategoryFilter !== "all") + Number(sparepartStockFilter !== "all");
  const hasSparepartFilters = activeSparepartFilterCount > 0;

  const resetSparepartFilters = () => {
    setSparepartCategoryFilter("all");
    setSparepartStockFilter("all");
  };

  const renderSparepartFilters = () => (
    <>
      <Select value={sparepartCategoryFilter} onValueChange={setSparepartCategoryFilter}>
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder="Filter kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua kategori</SelectItem>
          {sparepartCategories.map((category) => (
            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sparepartStockFilter} onValueChange={(value) => setSparepartStockFilter(value as StockFilter)}>
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder="Filter stok" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua stok</SelectItem>
          <SelectItem value="critical">Stok kritis</SelectItem>
          <SelectItem value="out">Stok habis</SelectItem>
          <SelectItem value="safe">Stok aman</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  const handleAddSparepart = () => {
    setEditingSparepart(null);
    setSparepartDialogOpen(true);
  };

  const handleEditSparepart = (sparepart: InventoryItemWithCompatibilities) => {
    setEditingSparepart(sparepart);
    setSparepartDialogOpen(true);
  };

  const handlePrintSparepartLabel = (sparepart: InventoryItemWithCompatibilities) => {
    setPrintingSparepart(sparepart);
    setLabelDialogOpen(true);
  };

  const handleSparepartSuccess = (newSparepart?: InventoryItemWithCompatibilities) => {
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

  const handleRestockSuccess = (updatedSparepart: InventoryItemWithCompatibilities) => {
    setSpareparts((prev) =>
      prev.map((sp) => (sp.id === updatedSparepart.id ? updatedSparepart : sp))
    );
  };

  const handleImportSuccess = async () => {
    setIsLoadingSpareparts(true);
    const result = await getInventoryItems(tokoId);
    if (result.success && result.data) {
      setSpareparts(result.data);
    }
    setIsLoadingSpareparts(false);
  };

  const handleDeleteSparepartClick = (sparepart: InventoryItemWithCompatibilities) => {
    setDeletingSparepart(sparepart);
    setDeleteSparepartDialogOpen(true);
  };

  const handleDeleteSparepartConfirm = async () => {
    if (!deletingSparepart) return;
    setIsDeletingSparepart(true);
    const result = await deleteInventoryItem(deletingSparepart.id);
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

  const handlePricelistImportSuccess = async () => {
    setIsLoadingPricelists(true);
    const result = await getServicePricelists(tokoId);
    if (result.success && result.data) {
      setPricelists(result.data);
    }
    setIsLoadingPricelists(false);
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
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (value === "retail" && permissions.canManageRetail) setActiveTab("retail");
        else if (value === "phone_unit" && permissions.canManagePhoneUnits) setActiveTab("phone_unit");
        else if (value === "jasa" && permissions.canViewInventory) setActiveTab("jasa");
        else if (permissions.canViewInventory) setActiveTab("sparepart");
        else if (permissions.canManagePhoneUnits) setActiveTab("phone_unit");
        else setActiveTab("retail");
      }}
      className="w-full"
    >
      <TabsList className={cn("mb-4 grid w-full sm:inline-flex sm:w-auto", tabListColumns)}>
        {permissions.canViewInventory && (
          <TabsTrigger value="sparepart" className="gap-1.5">
            <RiArchiveLine className="h-4 w-4" />
            Sparepart
          </TabsTrigger>
        )}
        {permissions.canViewInventory && (
          <TabsTrigger value="jasa" className="gap-1.5">
            <RiPriceTag3Line className="h-4 w-4" />
            Jasa
          </TabsTrigger>
        )}
        {permissions.canManageRetail && (
          <TabsTrigger value="retail" className="gap-1.5">
            <RiShoppingBag3Line className="h-4 w-4" />
            Barang Retail
          </TabsTrigger>
        )}
        {permissions.canManagePhoneUnits && (
          <TabsTrigger value="phone_unit" className="gap-1.5">
            <RiSmartphoneLine className="h-4 w-4" />
            Unit Phone
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="sparepart">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-primary rounded-full" />
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Sparepart {!hasAnySparepartMutation && <span className="text-muted-foreground/60">(Hanya Baca)</span>}
              </h2>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
              {showRestockHistoryLink && permissions.canViewRestockHistory && (
                <Button asChild variant="outline" className="flex-1 sm:flex-none">
                  <Link href={`/${tokoId}/inventory/restock-history`}>
                    <RiHistoryLine className="h-4 w-4 mr-1.5" />
                    Riwayat Restock
                  </Link>
                </Button>
              )}
              {permissions.canRestockSparepart && (
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => setRestockDialogOpen(true)}
                >
                  <RiStackLine className="h-4 w-4 mr-1.5" />
                  Restock
                </Button>
              )}
              {permissions.canImportSparepart && (
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <RiUpload2Line className="h-4 w-4 mr-1.5" />
                  Import Excel
                </Button>
              )}
              {permissions.canCreateSparepart && (
                <Button
                  onClick={handleAddSparepart}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:from-primary/90 hover:to-primary/80 hover:shadow-xl hover:shadow-primary/30 sm:flex-none"
                >
                  <RiAddLine className="h-4 w-4 mr-1.5" />
                  Tambah Sparepart
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_220px_180px]">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={sparepartSearch}
                onChange={(e) => setSparepartSearch(e.target.value)}
                placeholder="Cari sparepart..."
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" className="md:hidden" onClick={() => setFilterSheetOpen(true)}>
              <RiFilter3Line className="h-4 w-4 mr-1.5" />
              Filter{activeSparepartFilterCount > 0 ? ` (${activeSparepartFilterCount})` : ""}
            </Button>
            <div className="hidden md:contents">
              {renderSparepartFilters()}
            </div>
          </div>

          <Drawer open={filterSheetOpen} onOpenChange={setFilterSheetOpen} direction="bottom">
            <DrawerContent className="max-h-[90dvh] overflow-hidden p-0 before:inset-0 before:rounded-t-2xl md:hidden">
              <div className="shrink-0 border-b bg-popover px-4 pb-4 pt-3">
                <DrawerTitle className="font-bold">Filter sparepart</DrawerTitle>
              </div>
              <div className="p-4">
                <div className="grid gap-3">
                  {renderSparepartFilters()}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={resetSparepartFilters} disabled={!hasSparepartFilters}>
                    <RiCloseLine className="h-4 w-4 mr-1.5" />
                    Reset
                  </Button>
                  <Button type="button" onClick={() => setFilterSheetOpen(false)}>
                    Terapkan
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {isLoadingSpareparts ? (
            <div className="p-8 flex items-center justify-center">
              <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "card" ? (
            filteredSpareparts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                  {sparepartSearch
                    ? "Tidak ditemukan sparepart sesuai pencarian"
                    : "Belum ada sparepart. Klik \"Tambah Sparepart\" untuk menambahkan."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSpareparts.map((sparepart) => {
                  const stockVariant = getSparepartStockVariant(sparepart);
                  const bgStyles: Record<StockVariant, string> = {
                    out: "bg-gradient-to-br from-destructive/5 via-card to-destructive/[0.02]",
                    critical: "bg-gradient-to-br from-primary/5 via-card to-primary/[0.02]",
                    safe: "bg-gradient-to-br from-chart-1/5 via-card to-chart-1/[0.02]",
                  };
                  const accentColors: Record<StockVariant, string> = {
                    out: "bg-destructive",
                    critical: "bg-sky-500",
                    safe: "bg-chart-1",
                  };
                  const iconBgStyles: Record<StockVariant, string> = {
                    out: "bg-destructive/10",
                    critical: "bg-primary/10",
                    safe: "bg-chart-1/10",
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
                            <span className="text-xs text-muted-foreground">Harga Beli</span>
                            <span className="font-semibold text-sm tabular-nums">
                              {sparepart.purchasePrice != null ? formatCurrency(sparepart.purchasePrice) : "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Harga Jual</span>
                            <span className="font-semibold text-sm tabular-nums">{formatCurrency(sparepart.defaultPrice)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">Supplier</span>
                            <span className="truncate text-sm font-medium">{sparepart.supplierName || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">Kategori</span>
                            <span className="truncate text-sm font-medium">{sparepart.category?.name || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Stok</span>
                            <SparepartStockBadge sparepart={sparepart} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Stok Kritis</span>
                            <span className="font-semibold text-sm tabular-nums">{sparepart.criticalStock}</span>
                          </div>
                          <div className="pt-2">
                            <span className="text-xs text-muted-foreground">Kompatibilitas</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <SparepartCompatibilityCell sparepart={sparepart} maxVisible={2} />
                            </div>
                          </div>
                        </div>
                        {hasSparepartRowActions && (
                          <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-border/50">
                            {permissions.canUpdateSparepart && (
                              <>
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
                              </>
                            )}
                            {permissions.canDeleteSparepart && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteSparepartClick(sparepart)}
                              >
                                <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
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
                <div className="overflow-x-auto">
                <Table className="min-w-[920px]">
                  <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Nama</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Harga Beli</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Harga Jual</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Kategori</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Supplier</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Stok</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Stok Kritis</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Kompatibilitas</TableHead>
                        {hasSparepartRowActions && <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest w-[112px]">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpareparts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={hasSparepartRowActions ? 9 : 8} className="h-24 text-center text-muted-foreground">
                          {sparepartSearch
                            ? "No spareparts found matching your search"
                            : "No spareparts yet. Click \"Add Sparepart\" to add one."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSpareparts.map((sparepart) => (
                        <TableRow key={sparepart.id} className="border-border/50">
                          <TableCell className="font-medium">{sparepart.name}</TableCell>
                          <TableCell>{sparepart.purchasePrice != null ? formatCurrency(sparepart.purchasePrice) : "-"}</TableCell>
                          <TableCell>{formatCurrency(sparepart.defaultPrice)}</TableCell>
                          <TableCell>{sparepart.category?.name || "-"}</TableCell>
                          <TableCell>{sparepart.supplierName || "-"}</TableCell>
                          <TableCell>
                            <SparepartStockBadge sparepart={sparepart} />
                          </TableCell>
                          <TableCell>{sparepart.criticalStock}</TableCell>
                          <TableCell>
                            <SparepartCompatibilityCell sparepart={sparepart} />
                          </TableCell>
                          {hasSparepartRowActions && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {permissions.canUpdateSparepart && (
                                  <>
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
                                  </>
                                )}
                                {permissions.canDeleteSparepart && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleDeleteSparepartClick(sparepart)}
                                  >
                                    <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {(permissions.canCreateSparepart || permissions.canUpdateSparepart) && (
          <SparepartFormDialog
            open={sparepartDialogOpen}
            onOpenChange={setSparepartDialogOpen}
            sparepart={editingSparepart}
            tokoId={tokoId}
            onSuccess={handleSparepartSuccess}
          />
        )}

        {permissions.canUpdateSparepart && (
          <SparepartLabelPrintDialog
            open={labelDialogOpen}
            onOpenChange={setLabelDialogOpen}
            sparepart={printingSparepart}
          />
        )}

        {permissions.canRestockSparepart && (
          <SparepartRestockDialog
            open={restockDialogOpen}
            onOpenChange={setRestockDialogOpen}
            tokoId={tokoId}
            onSuccess={handleRestockSuccess}
          />
        )}

        {permissions.canImportSparepart && (
          <SparepartImportDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            tokoId={tokoId}
            onSuccess={handleImportSuccess}
          />
        )}

        <DeleteDialog
          open={deleteInventoryItemDialogOpen}
          onOpenChange={setDeleteSparepartDialogOpen}
          title="Hapus Sparepart"
          description={`Apakah Anda yakin ingin menghapus "${deletingSparepart?.name}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDeleteSparepartConfirm}
          isLoading={isDeletingSparepart}
        />
      </TabsContent>

      <TabsContent value="jasa">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-chart-1 rounded-full" />
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Jasa Service {!hasServicePricelistActions && <span className="text-muted-foreground/60">(Hanya Baca)</span>}
              </h2>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
              {permissions.canManageServicePricelists && (
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => setPricelistImportDialogOpen(true)}
                >
                  <RiUpload2Line className="h-4 w-4 mr-1.5" />
                  Import Excel
                </Button>
              )}
              {permissions.canManageServicePricelists && (
                <Button
                  onClick={handleAddPricelist}
                  className="flex-1 bg-gradient-to-r from-chart-1 to-chart-1/90 shadow-lg shadow-chart-1/20 transition-all duration-200 hover:from-chart-1/90 hover:to-chart-1/80 hover:shadow-xl hover:shadow-chart-1/30 sm:flex-none"
                >
                  <RiAddLine className="h-4 w-4 mr-1.5" />
                  Tambah Jasa
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={pricelistSearch}
              onChange={(e) => setPricelistSearch(e.target.value)}
              placeholder="Cari jasa..."
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
                    ? "Tidak ditemukan jasa sesuai pencarian"
                    : "Belum ada jasa. Klik \"Tambah Jasa\" untuk menambahkan."}
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
                      {hasServicePricelistActions && (
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
                <div className="overflow-x-auto">
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Judul</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Harga Default</TableHead>
                      {hasServicePricelistActions && <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest w-[80px]">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPricelists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={hasServicePricelistActions ? 3 : 2} className="h-24 text-center text-muted-foreground">
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
                          {hasServicePricelistActions && (
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {permissions.canManageServicePricelists && (
          <ServicePricelistFormDialog
            open={pricelistDialogOpen}
            onOpenChange={setPricelistDialogOpen}
            pricelist={editingPricelist}
            tokoId={tokoId}
            onSuccess={handlePricelistSuccess}
          />
        )}

        {permissions.canManageServicePricelists && (
          <ServicePricelistImportDialog
            open={pricelistImportDialogOpen}
            onOpenChange={setPricelistImportDialogOpen}
            tokoId={tokoId}
            onSuccess={handlePricelistImportSuccess}
          />
        )}

        <DeleteDialog
          open={deletePricelistDialogOpen}
          onOpenChange={setDeletePricelistDialogOpen}
          title="Hapus Jasa"
          description={`Apakah Anda yakin ingin menghapus "${deletingPricelist?.title}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDeletePricelistConfirm}
          isLoading={isDeletingPricelist}
        />
      </TabsContent>

      {permissions.canManageRetail && (
        <TabsContent value="retail">
          <RetailItemTable
            tokoId={tokoId}
            readOnly={false}
            canRestock={permissions.canRestockSparepart}
            canImport={permissions.canImportSparepart}
          />
        </TabsContent>
      )}

      {permissions.canManagePhoneUnits && (
        <TabsContent value="phone_unit">
          <PhoneUnitTable
            tokoId={tokoId}
            readOnly={readOnly}
            canCreate={permissions.canCreateSparepart}
            canUpdate={permissions.canUpdateSparepart}
            canDelete={permissions.canDeleteSparepart}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
