"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { addItem } from "@/actions";
import { cn, formatCurrency, formatCurrencyInput, getCurrencyInputDigits } from "@/lib/utils";
import { useScannerPairing, ScannerPairingPanel, ScannerToggleButton } from "@/components/shared/scanner-pairing";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import { toast } from "sonner";
import { SparepartFormDialog } from "@/components/dashboard/inventory/inventory-item-form-dialog";
import { ServicePricelistFormDialog } from "@/components/dashboard/inventory/service-pricelist-form-dialog";
import {
  RiAddLine,
  RiBox3Line,
  RiCheckLine,
  RiCloseLine,
  RiInboxLine,
  RiSearchLine,
  RiSubtractLine,
  RiToolsLine,
} from "@remixicon/react";

interface AddRepairItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  tokoId: string;
  deviceName: string;
  spareparts: Array<{ id: string; name: string; barcode: string; defaultPrice: number; stock: number }>;
  servicePricelists: Array<{ id: string; title: string; defaultPrice: number }>;
  onSuccess: () => void;
  onError: (error: string) => void;
  onAddItem?: (item: { id: string; type: string; name: string; qty: number; price: number; isPending?: boolean }) => void;
  onAddItemSaved?: (
    tempId: string,
    item: { id: string; type: string; name: string; qty: number; price: number }
  ) => void;
  onAddItemError?: () => void;
  onSparepartCreated?: () => void;
  onPricelistCreated?: () => void;
}

type SparepartOption = AddRepairItemFormProps["spareparts"][number];
type RepairItemType = "inventory_item" | "service_catalog_item";

export function AddRepairItemForm({
  open,
  onOpenChange,
  serviceId,
  tokoId,
  deviceName,
  spareparts,
  servicePricelists,
  onSuccess,
  onError,
  onAddItem,
  onAddItemSaved,
  onAddItemError,
  onSparepartCreated,
  onPricelistCreated,
}: AddRepairItemFormProps) {
  const [itemType, setItemType] = useState<RepairItemType>("inventory_item");
  const [sparepartQtys, setSparepartQtys] = useState<Record<string, number>>({});
  const [serviceQtys, setServiceQtys] = useState<Record<string, number>>({});
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [sparepartFormOpen, setSparepartFormOpen] = useState(false);
  const [pricelistFormOpen, setPricelistFormOpen] = useState(false);
  const { user, manualItemsEnabled, staffCreateSparepartEnabled } = useDashboardScope();

  const isManualFilled = manualItemsEnabled && manualName.trim().length > 0 && !!manualPrice && parseInt(manualPrice, 10) >= 0;
  const hasSparepartsSelected = Object.values(sparepartQtys).some((q) => q > 0);
  const hasServicesSelected = Object.values(serviceQtys).some((q) => q > 0);
  const hasItemsSelected = hasSparepartsSelected || hasServicesSelected;

  const filteredSpareparts = spareparts.filter((sp) =>
    sp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredServicePricelists = servicePricelists.filter((sp) =>
    sp.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sparepartsTotal = spareparts
    .filter((sp) => (sparepartQtys[sp.id] ?? 0) > 0)
    .reduce((sum, sp) => sum + sp.defaultPrice * (sparepartQtys[sp.id] ?? 0), 0);
  const servicesTotal = servicePricelists
    .filter((sp) => (serviceQtys[sp.id] ?? 0) > 0)
    .reduce((sum, sp) => sum + sp.defaultPrice * (serviceQtys[sp.id] ?? 0), 0);
  const manualTotal = isManualFilled
    ? parseInt(manualPrice, 10) * (parseInt(manualQty, 10) || 1)
    : 0;
  const totalWithQuantity = sparepartsTotal + servicesTotal + manualTotal;
  const canSubmit = isManualFilled || hasItemsSelected;

  const handleMobileScan = useCallback((value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    const match = spareparts.find(
      (sp) => sp.barcode.toLowerCase() === trimmedValue.toLowerCase() || sp.id === trimmedValue
    );
    if (match) {
      if (match.stock <= 0) {
        toast.error(`Stok sparepart "${match.name}" habis`);
        return;
      }

      setSparepartQtys({ [match.id]: 1 });
      toast.success(`Sparepart "${match.name}" terpilih`);
    } else {
      toast.error(`Sparepart dengan kode "${trimmedValue}" tidak ditemukan di daftar kompatibel`);
    }
  }, [spareparts]);

  const canCreateSparepart = user.role !== "staff" || staffCreateSparepartEnabled;
  const scanner = useScannerPairing({ tokoId, onScan: handleMobileScan });

  function resetForm() {
    setItemType("inventory_item");
    setSparepartQtys({});
    setServiceQtys({});
    setManualName("");
    setManualPrice("");
    setManualQty("1");
    setSearchQuery("");
    scanner.setIsOpen(false);
  }

  function handleOpenChange(value: boolean) {
    if (!value) resetForm();
    onOpenChange(value);
  }

  function incrementQty(id: string, setter: typeof setSparepartQtys) {
    setter((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function incrementSparepartQty(sparepart: SparepartOption) {
    const current = sparepartQtys[sparepart.id] ?? 0;

    if (sparepart.stock <= 0) {
      toast.error(`Stok sparepart "${sparepart.name}" habis`);
      return;
    }

    if (current >= sparepart.stock) {
      toast.error(`Stok sparepart "${sparepart.name}" hanya tersedia ${sparepart.stock}`);
      return;
    }

    incrementQty(sparepart.id, setSparepartQtys);
  }

  function decrementQty(
    id: string,
    setter: typeof setSparepartQtys
  ) {
    setter((prev) => {
      const current = prev[id] ?? 0;
      if (current <= 1) {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      return { ...prev, [id]: current - 1 };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      onError("Isi nama dan harga manual atau pilih dari daftar");
      return;
    }

    const manualItems = isManualFilled
      ? [{ type: itemType, id: "", name: manualName.trim(), defaultPrice: parseInt(manualPrice, 10), qty: parseInt(manualQty, 10) || 1 }]
      : [];

    const selectedSpareparts = spareparts
      .filter((sp) => (sparepartQtys[sp.id] ?? 0) > 0)
      .map((sp) => ({ ...sp, type: "inventory_item" as const, qty: sparepartQtys[sp.id] }));
    const selectedServices = servicePricelists
      .filter((sp) => (serviceQtys[sp.id] ?? 0) > 0)
      .map((sp) => ({ type: "service_catalog_item" as const, ...sp, qty: serviceQtys[sp.id] }));

    const itemsToAdd = [...manualItems, ...selectedSpareparts, ...selectedServices];
    const pendingItems = itemsToAdd.map((item) => {
      const isManual = item.id === "";
      const itemNameToUse = isManual
        ? manualName.trim()
        : "name" in item
          ? item.name
          : (item as typeof item & { title: string }).title;
      const itemPriceToUse = isManual ? parseInt(manualPrice, 10) : item.defaultPrice;
      const itemTypeToUse = item.type;
      const tempId = `temp-${crypto.randomUUID()}`;

      return {
        tempId,
        newItem: {
          id: tempId,
          type: itemTypeToUse,
          name: itemNameToUse || "",
          qty: item.qty,
          price: itemPriceToUse,
          isPending: true,
        },
        payload: {
          repairOrderId: serviceId,
          type: itemTypeToUse,
          inventoryItemId: itemTypeToUse === "inventory_item" && !isManual ? item.id : undefined,
          serviceCatalogItemId: itemTypeToUse === "service_catalog_item" && !isManual ? item.id : undefined,
          name: itemNameToUse || "",
          qty: item.qty,
          price: itemPriceToUse,
        },
      };
    });

    pendingItems.forEach(({ newItem }) => onAddItem?.(newItem));
    handleOpenChange(false);

    try {
      for (const pendingItem of pendingItems) {
        const result = await addItem(pendingItem.payload);

        if (!result.success) {
          onAddItemError?.();
          onError(result.error || "Gagal menambahkan item");
          return;
        }

        if (result.data) {
          onAddItemSaved?.(pendingItem.tempId, result.data);
        }
      }

      onSuccess();
    } catch (err) {
      console.error("Error adding item:", err);
      onAddItemError?.();
      onError("Gagal menambahkan item");
    }
  }

  function QtyStepper({ qty, onIncrement, onDecrement, incrementDisabled = false }: { qty: number; onIncrement: () => void; onDecrement: () => void; incrementDisabled?: boolean }) {
    return (
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <Button type="button" variant="outline" size="icon" className="size-6" onClick={onDecrement}>
          <RiSubtractLine className="size-3" />
        </Button>
        <span className="flex w-6 items-center justify-center text-xs font-medium tabular-nums">
          {qty}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("size-6", incrementDisabled && "opacity-50")}
          onClick={onIncrement}
          aria-disabled={incrementDisabled}
        >
          <RiAddLine className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <RiBox3Line className="size-4" />
              </span>
              Tambah Item Perbaikan
            </DialogTitle>
            <DialogDescription>
              Tambahkan sparepart atau jasa ke tugas perbaikan ini
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  <RiToolsLine className="size-4" />
                  Pilih Item
                </span>
              </div>

              <div className="flex flex-col gap-4 border-l border-border pl-3 sm:ml-4 sm:pl-4">
                <Tabs
                  value={itemType}
                  onValueChange={(value) => {
                    setItemType(value as typeof itemType);
                    setSearchQuery("");
                  }}
                >
                  <TabsList variant="line" className="w-full">
                    <TabsTrigger value="inventory_item" className="flex-1">Sparepart</TabsTrigger>
                    <TabsTrigger value="service_catalog_item" className="flex-1">Jasa</TabsTrigger>
                  </TabsList>

                  <TabsContent value="inventory_item" className="mt-4 flex flex-col gap-3">
                    {manualItemsEnabled && (
                      <>
                        <div className="grid gap-2 sm:grid-cols-[1fr_7rem_5rem] sm:items-end">
                          <div className="flex-1 min-w-0 flex flex-col gap-2">
                            <Label htmlFor="manual-item-name" className="text-sm">Nama Item</Label>
                            <Input
                              id="manual-item-name"
                              value={manualName}
                              onChange={(e) => setManualName(e.target.value)}
                              placeholder="Contoh: LCD iPhone 11"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="manual-item-price" className="text-sm">Harga</Label>
                            <Input
                              id="manual-item-price"
                              type="text"
                              inputMode="numeric"
                              value={formatCurrencyInput(manualPrice)}
                              onChange={(e) => setManualPrice(getCurrencyInputDigits(e.target.value))}
                              min="0"
                              placeholder="0"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="manual-item-qty" className="text-sm">Qty</Label>
                            <Input
                              id="manual-item-qty"
                              type="number"
                              value={manualQty}
                              onChange={(e) => setManualQty(e.target.value)}
                              min="1"
                              className="text-center"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">atau pilih dari inventaris</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      </>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <Label className="text-sm">Pilih Sparepart</Label>
                        <span className="text-xs text-muted-foreground">
                          Kompatibel dengan {deviceName}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {scanner.enabled && (
                          <ScannerToggleButton
                            isOpen={scanner.isOpen}
                            onToggle={() => scanner.setIsOpen((open) => !open)}
                            state={scanner.state}
                          />
                        )}
                        {canCreateSparepart && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSparepartFormOpen(true)}
                          >
                            <RiAddLine className="size-3.5" />
                            Sparepart Baru
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <RiSearchLine className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Cari sparepart..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <RiCloseLine className="size-4" />
                        </button>
                      )}
                    </div>

                    {scanner.enabled && scanner.isOpen && scanner.state !== "connected" && (
                      <ScannerPairingPanel host={scanner} onClose={() => scanner.setIsOpen(false)} />
                    )}

                    {filteredSpareparts.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                        <RiInboxLine className="size-4 shrink-0" />
                        {searchQuery ? "Tidak ditemukan sparepart sesuai pencarian" : "Tidak ada sparepart tersedia di inventaris"}
                      </div>
                    ) : (
                      <ScrollArea className="h-[240px] sm:h-[300px]">
                        <div className="space-y-1.5 pr-1">
                          {filteredSpareparts.map((sp) => {
                            const qty = sparepartQtys[sp.id] ?? 0;
                            return (
                              <div
                                key={sp.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => incrementSparepartQty(sp)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") incrementSparepartQty(sp); }}
                                className={cn(
                                   "flex cursor-pointer flex-col gap-2 rounded-md border px-3 py-2 transition-all sm:flex-row sm:items-center sm:justify-between",
                                  qty > 0
                                    ? "border-primary bg-primary/10"
                                    : "border-muted bg-background hover:border-muted-foreground/50 hover:bg-muted/30"
                                )}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                                  <div className={cn(
                                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                                    qty > 0
                                      ? "border-primary bg-primary"
                                      : "border-muted-foreground/30"
                                  )}>
                                    {qty > 0 && (
                                      <RiCheckLine className="size-2.5 text-primary-foreground" />
                                    )}
                                  </div>
                                  <span className={cn(
                                    "block truncate text-sm font-medium",
                                    qty > 0 ? "text-primary" : "text-foreground"
                                  )}>
                                    {sp.name}
                                  </span>
                                </div>
                                <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
                                  <span className={cn(
                                    "text-xs font-semibold",
                                    qty > 0 ? "text-primary" : "text-muted-foreground"
                                  )}>
                                    {formatCurrency(sp.defaultPrice)}
                                  </span>
                                  <span className={cn(
                                    "rounded px-1.5 py-0.5 text-xs font-medium",
                                    sp.stock > 0
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  )}>
                                    {sp.stock <= 0 ? "Habis" : `Stok: ${sp.stock}`}
                                  </span>
                                  <QtyStepper
                                    qty={qty}
                                    onIncrement={() => incrementSparepartQty(sp)}
                                    onDecrement={() => decrementQty(sp.id, setSparepartQtys)}
                                    incrementDisabled={qty >= sp.stock}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  <TabsContent value="service_catalog_item" className="mt-4 flex flex-col gap-3">
                    {manualItemsEnabled && (
                      <>
                        <div className="grid gap-2 sm:grid-cols-[1fr_7rem_5rem] sm:items-end">
                          <div className="flex-1 min-w-0 flex flex-col gap-2">
                            <Label htmlFor="manual-item-name" className="text-sm">Nama Item</Label>
                            <Input
                              id="manual-item-name"
                              value={manualName}
                              onChange={(e) => setManualName(e.target.value)}
                              placeholder="Contoh: Jasa bongkar pasang"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="manual-item-price" className="text-sm">Harga</Label>
                            <Input
                              id="manual-item-price"
                              type="text"
                              inputMode="numeric"
                              value={formatCurrencyInput(manualPrice)}
                              onChange={(e) => setManualPrice(getCurrencyInputDigits(e.target.value))}
                              min="0"
                              placeholder="0"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="manual-item-qty" className="text-sm">Qty</Label>
                            <Input
                              id="manual-item-qty"
                              type="number"
                              value={manualQty}
                              onChange={(e) => setManualQty(e.target.value)}
                              min="1"
                              className="text-center"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">atau pilih dari daftar</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      </>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Label className="text-sm">Pilih Jasa</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPricelistFormOpen(true)}
                      >
                        <RiAddLine className="size-3.5" />
                        Jasa Baru
                      </Button>
                    </div>

                    <div className="relative">
                      <RiSearchLine className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Cari jasa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <RiCloseLine className="size-4" />
                        </button>
                      )}
                    </div>

                    {filteredServicePricelists.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                        <RiInboxLine className="size-4 shrink-0" />
                        {searchQuery ? "Tidak ditemukan jasa sesuai pencarian" : "Tidak ada jasa tersedia"}
                      </div>
                    ) : (
                      <ScrollArea className="h-[240px] sm:h-[300px]">
                        <div className="space-y-1.5 pr-1">
                          {filteredServicePricelists.map((sp) => {
                            const qty = serviceQtys[sp.id] ?? 0;
                            return (
                              <div
                                key={sp.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => incrementQty(sp.id, setServiceQtys)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") incrementQty(sp.id, setServiceQtys); }}
                                className={cn(
                                  "flex cursor-pointer flex-col gap-2 rounded-md border px-3 py-2 transition-all sm:flex-row sm:items-center sm:justify-between",
                                  qty > 0
                                    ? "border-primary bg-primary/10"
                                    : "border-muted bg-background hover:border-muted-foreground/50 hover:bg-muted/30"
                                )}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                                  <div className={cn(
                                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                                    qty > 0
                                      ? "border-primary bg-primary"
                                      : "border-muted-foreground/30"
                                  )}>
                                    {qty > 0 && (
                                      <RiCheckLine className="size-2.5 text-primary-foreground" />
                                    )}
                                  </div>
                                  <span className={cn(
                                    "block truncate text-sm font-medium",
                                    qty > 0 ? "text-primary" : "text-foreground"
                                  )}>
                                    {sp.title}
                                  </span>
                                </div>
                                <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
                                  <span className={cn(
                                    "text-xs font-semibold",
                                    qty > 0 ? "text-primary" : "text-muted-foreground"
                                  )}>
                                    {formatCurrency(sp.defaultPrice)}
                                  </span>
                                  <QtyStepper
                                    qty={qty}
                                    onIncrement={() => incrementQty(sp.id, setServiceQtys)}
                                    onDecrement={() => decrementQty(sp.id, setServiceQtys)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" className="sm:order-2" onClick={() => handleOpenChange(false)}>
                Batal
              </Button>
              {(isManualFilled || hasItemsSelected) && (
                <div className="flex items-center text-sm text-muted-foreground sm:order-1 sm:mr-auto">
                  Total: <span className="ml-1 font-semibold text-foreground">
                    {formatCurrency(totalWithQuantity)}
                  </span>
                </div>
              )}
              <Button type="submit" disabled={!canSubmit} className="sm:order-3">
                <RiAddLine className="size-4" />
                Tambah Item
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <SparepartFormDialog
        open={sparepartFormOpen}
        onOpenChange={setSparepartFormOpen}
        tokoId={tokoId}
        onSuccess={() => {
          setSparepartFormOpen(false);
          onSparepartCreated?.();
        }}
      />
      <ServicePricelistFormDialog
        open={pricelistFormOpen}
        onOpenChange={setPricelistFormOpen}
        tokoId={tokoId}
        onSuccess={() => {
          setPricelistFormOpen(false);
          onPricelistCreated?.();
        }}
      />
    </>
  );
}
