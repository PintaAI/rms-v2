"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createInventoryItem,

  getInventoryCategories,

  updateInventoryItem,

  type InventoryCategory,

  type InventoryItemKind,

  type InventoryItemWithCompatibilities,
} from "@/actions/inventory";
import { MultiDeviceInput, type DeviceModelOption } from "@/components/shared/multi-device-input";
import { loadDeviceCatalog, refreshDeviceCatalogIfStale } from "@/lib/device-catalog-cache";
import { cn, formatCurrencyInput, getCurrencyInputDigits } from "@/lib/utils";
import {
  RiAddLine,
  RiBox3Line,
  RiCheckLine,
  RiDeviceLine,
  RiEditLine,
  RiPriceTag3Line,
  RiSearchLine,
  RiShieldCheckLine,
  RiStackLine,
} from "@remixicon/react";

interface SparepartFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sparepart?: InventoryItemWithCompatibilities | null;
  tokoId: string;
  onOptimisticCreate?: (tempSparepart: InventoryItemWithCompatibilities) => void;
  onOptimisticUpdate?: (updatedSparepart: InventoryItemWithCompatibilities) => void;
  onRevertCreate?: () => void;
  onRevertUpdate?: () => void;
  onSuccess: (newSparepart?: InventoryItemWithCompatibilities) => void;
}

type InventoryItemFormMode = InventoryItemKind;

interface InventoryItemFormDialogProps extends SparepartFormProps {
  mode: InventoryItemFormMode;
}

function toDeviceOptions(sparepart?: InventoryItemWithCompatibilities | null): DeviceModelOption[] {
  return (
    sparepart?.compatibilities.map((c) => ({
      id: c.deviceModel.id,
      modelName: c.deviceModel.modelName,
      brandName: c.deviceModel.brand.name,
    })) ?? []
  );
}

function SparepartFormContent({
  mode,
  sparepart,
  tokoId,
  onOpenChange,
  onOptimisticCreate,
  onOptimisticUpdate,
  onRevertCreate,
  onRevertUpdate,
  onSuccess,
}: Omit<InventoryItemFormDialogProps, "open">) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(sparepart?.name ?? "");
  const [defaultPrice, setDefaultPrice] = useState(sparepart ? sparepart.defaultPrice.toString() : "");
  const [purchasePrice, setPurchasePrice] = useState(sparepart?.purchasePrice != null ? sparepart.purchasePrice.toString() : "");
  const [supplierName, setSupplierName] = useState(sparepart?.supplierName ?? "");
  const [categoryName, setCategoryName] = useState(sparepart?.category?.name ?? "");
  const [stock, setStock] = useState(sparepart ? sparepart.stock.toString() : "");
  const [criticalStock, setCriticalStock] = useState(sparepart ? sparepart.criticalStock.toString() : "5");
  const [warrantyDays, setWarrantyDays] = useState(sparepart?.warrantyDays != null ? sparepart.warrantyDays.toString() : "");
  const [isUniversal, setIsUniversal] = useState(sparepart?.isUniversal ?? false);
  const [selectedDevices, setSelectedDevices] = useState<DeviceModelOption[]>(() => toDeviceOptions(sparepart));
  const sparepartRef = useRef(sparepart);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [devices, setDevices] = useState<DeviceModelOption[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const isRetailItem = mode === "retail_product";
  const itemLabel = isRetailItem ? "Barang Retail" : "Sparepart";
  const trimmedCategoryQuery = categoryName.trim();
  const exactCategoryMatch = useMemo(
    () => categories.find((category) => category.name.toLowerCase() === trimmedCategoryQuery.toLowerCase()) ?? null,
    [categories, trimmedCategoryQuery]
  );
  const filteredCategories = useMemo(() => {
    if (!trimmedCategoryQuery) return categories.slice(0, 20);

    const normalizedQuery = trimmedCategoryQuery.toLowerCase();
    return categories
      .filter((category) => category.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 20);
  }, [categories, trimmedCategoryQuery]);

  useEffect(() => {
    let active = true;

    getInventoryCategories(tokoId, mode)
      .then((result) => {
        if (!active) return;
        if (result.success && result.data) setCategories(result.data);
      })
      .catch(() => undefined);

    loadDeviceCatalog()
      .then((catalog) => {
        if (!active) return;
        setDevices(catalog.devices);
      })
      .catch(() => {
        if (!active) return;
        setDevices([]);
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingDevices(false);
      });

    return () => {
      active = false;
    };
  }, [mode, tokoId]);

  useEffect(() => {
    const handleFocus = () => {
      refreshDeviceCatalogIfStale()
        .then((catalog) => {
          if (catalog) setDevices(catalog.devices);
        })
        .catch(() => undefined);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeviceCreated = useCallback((device: DeviceModelOption) => {
    setDevices((prev) => {
      const next = prev.some((item) => item.id === device.id)
        ? prev.map((item) => (item.id === device.id ? device : item))
        : [...prev, device];

      return next.sort((a, b) => {
        const brandCompare = a.brandName.localeCompare(b.brandName);
        return brandCompare === 0 ? a.modelName.localeCompare(b.modelName) : brandCompare;
      });
    });
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCategoryName(e.target.value);
    setShowCategoryDropdown(true);
  }, []);

  const handleCategorySelect = useCallback((category: InventoryCategory) => {
    setCategoryName(category.name);
    setShowCategoryDropdown(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = parseInt(defaultPrice, 10);
    if (isNaN(price) || price < 0) {
      setError("Harga jual harus berupa angka yang valid");
      return;
    }

    const parsedPurchasePrice = purchasePrice.trim() ? parseInt(purchasePrice, 10) : null;
    if (parsedPurchasePrice !== null && (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0)) {
      setError("Harga beli harus berupa angka yang valid");
      return;
    }

    const stockValue = parseInt(stock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      setError("Stok harus berupa angka yang valid");
      return;
    }

    const criticalStockValue = parseInt(criticalStock, 10);
    if (isNaN(criticalStockValue) || criticalStockValue < 0) {
      setError("Stok kritis harus berupa angka yang valid");
      return;
    }

    const warrantyDaysValue = warrantyDays.trim() ? parseInt(warrantyDays, 10) : null;
    if (isRetailItem && warrantyDaysValue !== null && (isNaN(warrantyDaysValue) || warrantyDaysValue < 1)) {
      setError("Garansi harus berupa angka minimal 1 hari");
      return;
    }

    const deviceModelIds = isRetailItem ? [] : selectedDevices.map((d) => d.id);
    const finalIsUniversal = isRetailItem || deviceModelIds.length === 0 ? true : isUniversal;
    const trimmedCategoryName = categoryName.trim();
    const existingCategory = trimmedCategoryName
      ? categories.find((category) => category.name.toLowerCase() === trimmedCategoryName.toLowerCase())
      : null;
    const finalCategoryName = existingCategory?.name ?? trimmedCategoryName;
    const optimisticCategory = finalCategoryName
      ? existingCategory ?? {
          id: `temp-category-${Date.now()}`,
          name: finalCategoryName,
          kind: mode,
          storeId: tokoId,
        }
      : null;

    const tempId = sparepart?.id || `temp-${Date.now()}`;
    const optimisticSparepart: InventoryItemWithCompatibilities = {
      id: tempId,
      barcode: sparepart?.barcode ?? "membuat...",
      name,
      defaultPrice: price,
      purchasePrice: parsedPurchasePrice,
      supplierName: supplierName.trim() || null,
      categoryId: optimisticCategory?.id ?? null,
      stock: stockValue,
      criticalStock: criticalStockValue,
      warrantyDays: isRetailItem ? warrantyDaysValue : null,
      isUniversal: finalIsUniversal,
      type: mode,
      storeId: tokoId,
      category: optimisticCategory,
      compatibilities: isRetailItem ? [] : selectedDevices.map((d) => ({
        deviceModelId: d.id,
        inventoryItemId: tempId,
        deviceModel: {
          id: d.id,
          modelName: d.modelName,
          brand: { id: "", name: d.brandName },
        },
      })),
    };

    if (!sparepartRef.current && onOptimisticCreate) {
      onOptimisticCreate(optimisticSparepart);
      onOpenChange(false);
    }

    if (sparepartRef.current && onOptimisticUpdate) {
      onOptimisticUpdate(optimisticSparepart);
      onOpenChange(false);
    }

    setIsLoading(true);

    const result = sparepartRef.current
      ? await updateInventoryItem({
          id: sparepartRef.current.id,
          name,
          defaultPrice: price,
          purchasePrice: parsedPurchasePrice,
          supplierName: supplierName.trim() || null,
          categoryName: finalCategoryName || null,
          stock: stockValue,
          criticalStock: criticalStockValue,
          warrantyDays: isRetailItem ? warrantyDaysValue : null,
          isUniversal: finalIsUniversal,
          type: mode,
          deviceModelIds,
        })
      : await createInventoryItem({
          name,
          defaultPrice: price,
          purchasePrice: parsedPurchasePrice,
          supplierName: supplierName.trim() || null,
          categoryName: finalCategoryName || null,
          stock: stockValue,
          criticalStock: criticalStockValue,
          warrantyDays: isRetailItem ? warrantyDaysValue : null,
          isUniversal: finalIsUniversal,
          type: mode,
          storeId: tokoId,
          deviceModelIds,
        });

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Gagal menyimpan sparepart");
      if (!sparepartRef.current && onRevertCreate) onRevertCreate();
      if (sparepartRef.current && onRevertUpdate) onRevertUpdate();
      return;
    }

    if (result.data) {
      onSuccess(result.data);
      onOpenChange(false);
    }
  }

  return (
    <DialogContent className="flex w-[calc(100%-1rem)] flex-col p-0 sm:max-w-2xl">
      <DialogHeader className="px-4 py-3 sm:px-6 sm:pb-2 sm:pt-6">
        <DialogTitle className="flex items-center gap-2 text-base sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary sm:size-8">
            <RiBox3Line className="size-4" />
          </span>
          {sparepart ? `Edit ${itemLabel}` : `Tambah ${itemLabel}`}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="px-4 sm:px-6">
        <div className="flex flex-col gap-3 py-3 sm:gap-4 sm:py-4">
        <div className="flex flex-col gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1">
            <div className="h-4 w-1 rounded-full bg-primary sm:h-5" />
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground sm:text-sm">
              <RiEditLine className="size-4" />
              Informasi Dasar
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:ml-4 sm:gap-4 sm:border-l sm:border-border sm:pl-4">
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <Label htmlFor="name" className="text-xs sm:text-sm">Nama {itemLabel}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRetailItem ? "Contoh: Charger USB-C 20W" : "Contoh: LCD iPhone 13"}
                disabled={isLoading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="price" className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <RiPriceTag3Line className="size-3.5" />
                    Harga Jual
                  </Label>
                  <span className="text-sm leading-none text-destructive">*</span>
                </div>
                <Input
                  id="price"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyInput(defaultPrice)}
                  onChange={(e) => setDefaultPrice(getCurrencyInputDigits(e.target.value))}
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Label htmlFor="purchasePrice" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <RiPriceTag3Line className="size-3.5" />
                  Harga Beli
                </Label>
                <Input
                  id="purchasePrice"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyInput(purchasePrice)}
                  onChange={(e) => setPurchasePrice(getCurrencyInputDigits(e.target.value))}
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="stock" className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <RiStackLine className="size-3.5" />
                    Stok
                  </Label>
                  <span className="text-sm leading-none text-destructive">*</span>
                </div>
                <Input
                  id="stock"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Label htmlFor="criticalStock" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <RiStackLine className="size-3.5" />
                  Stok Kritis
                </Label>
                <Input
                  id="criticalStock"
                  type="number"
                  value={criticalStock}
                  onChange={(e) => setCriticalStock(e.target.value)}
                  placeholder="5"
                  min="0"
                  disabled={isLoading}
                  required
                />
                <p className="hidden text-xs text-muted-foreground sm:block">Barang dianggap kritis jika stok sama dengan atau di bawah angka ini.</p>
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Label htmlFor="supplierName" className="text-xs sm:text-sm">Nama Supplier</Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Contoh: Toko Supplier Jaya"
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Label htmlFor="categoryName" className="text-xs sm:text-sm">Kategori</Label>
                <div className="relative" ref={categoryDropdownRef}>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={handleCategoryChange}
                    onFocus={() => setShowCategoryDropdown(true)}
                    placeholder={isRetailItem ? "Contoh: Aksesoris, HP Second, Charger" : "Contoh: LCD, Baterai, Konektor"}
                    disabled={isLoading}
                    autoComplete="off"
                  />

                  {showCategoryDropdown && !isLoading && (filteredCategories.length > 0 || trimmedCategoryQuery) && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-input bg-background shadow-lg">
                      {filteredCategories.length > 0 && (
                        <div className="py-1">
                          <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Kategori yang Sudah Ada
                          </div>
                          {filteredCategories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                              onClick={() => handleCategorySelect(category)}
                            >
                              <RiPriceTag3Line className="size-4 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
                              <RiCheckLine
                                className={cn(
                                  "size-4 text-muted-foreground transition-opacity",
                                  exactCategoryMatch?.id === category.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {trimmedCategoryQuery && !exactCategoryMatch && (
                        <div className="border-t p-4">
                          {filteredCategories.length === 0 && (
                            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                              <RiSearchLine className="size-4" />
                              Tidak ada kategori yang ditemukan
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCategoryDropdown(false)}
                            className="w-full"
                          >
                            <RiAddLine className="mr-2 size-4" />
                            Buat &quot;{trimmedCategoryQuery}&quot;
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="hidden text-xs text-muted-foreground sm:block">Kategori baru akan dibuat otomatis saat disimpan.</p>
              </div>

              {isRetailItem && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="warrantyDays" className="flex items-center gap-1.5 text-sm">
                    <RiShieldCheckLine className="size-3.5" />
                    Garansi (hari)
                  </Label>
                  <Input
                    id="warrantyDays"
                    type="number"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(e.target.value)}
                    placeholder="Contoh: 30"
                    min="1"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Kosongkan jika barang ini tidak memiliki garansi.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {!isRetailItem && <div className="border-t" />}

        {!isRetailItem && (
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1">
              <div className="h-4 w-1 rounded-full bg-primary sm:h-5" />
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground sm:text-sm">
                <RiDeviceLine className="size-4" />
                Kompatibilitas
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:ml-4 sm:gap-4 sm:border-l sm:border-border sm:pl-4">
              {selectedDevices.length === 0 && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="isUniversal"
                    checked={isUniversal}
                    onCheckedChange={(checked) => setIsUniversal(checked === true)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="isUniversal" className="text-xs leading-relaxed sm:text-sm">Universal (dapat digunakan di perangkat apapun)</Label>
                </div>
              )}

              {!isUniversal && (
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <Label className="text-xs sm:text-sm">Perangkat Kompatibel</Label>
                  <MultiDeviceInput
                    value={selectedDevices}
                    onChange={(devices) => {
                      setSelectedDevices(devices);
                      if (devices.length > 0) {
                        setIsUniversal(false);
                      }
                    }}
                    disabled={isLoading}
                    devices={devices}
                    isLoadingDevices={isLoadingDevices}
                    onDeviceCreated={handleDeviceCreated}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          <span className="text-destructive">*</span> Menandakan kolom yang wajib diisi
        </p>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <svg className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Menyimpan..."
              : sparepart
                ? "Perbarui"
                : "Buat"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function SparepartFormDialog(props: SparepartFormProps) {
  return <InventoryItemFormDialog {...props} mode="repair_part" />;
}

export function InventoryItemFormDialog(props: InventoryItemFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <SparepartFormContent key={props.sparepart?.id ?? `new-${props.mode}`} {...props} /> : null}
    </Dialog>
  );
}
