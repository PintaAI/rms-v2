"use client";

import { useRef, useState, useEffect, useCallback } from "react";
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
  createSparepart,
  getSparepartCategories,
  updateSparepart,
  type InventoryItemKind,
  type SparepartCategory,
  type SparepartWithCompatibilities,
} from "@/actions/inventory";
import { MultiDeviceInput, type HpCatalogOption } from "@/components/shared/multi-device-input";
import { loadDeviceCatalog, refreshDeviceCatalogIfStale } from "@/lib/device-catalog-cache";
import { RiEditLine, RiPriceTag3Line, RiStackLine, RiDeviceLine, RiBox3Line } from "@remixicon/react";

interface SparepartFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sparepart?: SparepartWithCompatibilities | null;
  tokoId: string;
  onOptimisticCreate?: (tempSparepart: SparepartWithCompatibilities) => void;
  onOptimisticUpdate?: (updatedSparepart: SparepartWithCompatibilities) => void;
  onRevertCreate?: () => void;
  onRevertUpdate?: () => void;
  onSuccess: (newSparepart?: SparepartWithCompatibilities) => void;
}

type InventoryItemFormMode = InventoryItemKind;

interface InventoryItemFormDialogProps extends SparepartFormProps {
  mode: InventoryItemFormMode;
}

function toDeviceOptions(sparepart?: SparepartWithCompatibilities | null): HpCatalogOption[] {
  return (
    sparepart?.compatibilities.map((c) => ({
      id: c.hpCatalog.id,
      modelName: c.hpCatalog.modelName,
      brandName: c.hpCatalog.brand.name,
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
  const [isUniversal, setIsUniversal] = useState(sparepart?.isUniversal ?? false);
  const [selectedDevices, setSelectedDevices] = useState<HpCatalogOption[]>(() => toDeviceOptions(sparepart));
  const sparepartRef = useRef(sparepart);
  const [categories, setCategories] = useState<SparepartCategory[]>([]);
  const [devices, setDevices] = useState<HpCatalogOption[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const isRetailItem = mode === "retail_item";
  const itemLabel = isRetailItem ? "Barang Retail" : "Sparepart";

  useEffect(() => {
    let active = true;

    getSparepartCategories(tokoId)
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
  }, [tokoId]);

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

  const handleDeviceCreated = useCallback((device: HpCatalogOption) => {
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

    const hpCatalogIds = isRetailItem ? [] : selectedDevices.map((d) => d.id);
    const finalIsUniversal = isRetailItem || hpCatalogIds.length === 0 ? true : isUniversal;
    const trimmedCategoryName = categoryName.trim();
    const optimisticCategory = trimmedCategoryName
      ? categories.find((category) => category.name.toLowerCase() === trimmedCategoryName.toLowerCase()) ?? {
          id: `temp-category-${Date.now()}`,
          name: trimmedCategoryName,
          tokoId,
        }
      : null;

    const tempId = sparepart?.id || `temp-${Date.now()}`;
    const optimisticSparepart: SparepartWithCompatibilities = {
      id: tempId,
      barcode: sparepart?.barcode ?? "membuat...",
      name,
      defaultPrice: price,
      purchasePrice: parsedPurchasePrice,
      supplierName: supplierName.trim() || null,
      categoryId: optimisticCategory?.id ?? null,
      stock: stockValue,
      criticalStock: criticalStockValue,
      isUniversal: finalIsUniversal,
      kind: mode,
      tokoId,
      category: optimisticCategory,
      compatibilities: isRetailItem ? [] : selectedDevices.map((d) => ({
        hpCatalogId: d.id,
        sparepartId: tempId,
        hpCatalog: {
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
      ? await updateSparepart({
          id: sparepartRef.current.id,
          name,
          defaultPrice: price,
          purchasePrice: parsedPurchasePrice,
          supplierName: supplierName.trim() || null,
          categoryName: trimmedCategoryName || null,
          stock: stockValue,
          criticalStock: criticalStockValue,
          isUniversal: finalIsUniversal,
          kind: mode,
          hpCatalogIds,
        })
      : await createSparepart({
          name,
          defaultPrice: price,
          purchasePrice: parsedPurchasePrice,
          supplierName: supplierName.trim() || null,
          categoryName: trimmedCategoryName || null,
          stock: stockValue,
          criticalStock: criticalStockValue,
          isUniversal: finalIsUniversal,
          kind: mode,
          tokoId,
          hpCatalogIds,
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
    <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] overflow-visible sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <RiBox3Line className="size-4" />
          </span>
          {sparepart ? `Edit ${itemLabel}` : `Tambah ${itemLabel}`}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <RiEditLine className="size-4" />
              Informasi Dasar
            </span>
          </div>

          <div className="flex flex-col gap-4 border-l border-border pl-3 sm:ml-4 sm:pl-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="text-sm">Nama {itemLabel}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRetailItem ? "Contoh: Charger USB-C 20W" : "Contoh: LCD iPhone 13"}
                disabled={isLoading}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="price" className="flex items-center gap-1.5 text-sm">
                    <RiPriceTag3Line className="size-3.5" />
                    Harga Jual
                  </Label>
                  <span className="text-sm leading-none text-destructive">*</span>
                </div>
                <Input
                  id="price"
                  type="number"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="purchasePrice" className="flex items-center gap-1.5 text-sm">
                  <RiPriceTag3Line className="size-3.5" />
                  Harga Beli
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="stock" className="flex items-center gap-1.5 text-sm">
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="criticalStock" className="flex items-center gap-1.5 text-sm">
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
                <p className="text-xs text-muted-foreground">Barang dianggap kritis jika stok sama dengan atau di bawah angka ini.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="supplierName" className="text-sm">Nama Supplier</Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Contoh: Toko Supplier Jaya"
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="categoryName" className="text-sm">Kategori</Label>
                <Input
                  id="categoryName"
                  list="sparepart-category-options"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder={isRetailItem ? "Contoh: Aksesoris, HP Second, Charger" : "Contoh: LCD, Baterai, Konektor"}
                  disabled={isLoading}
                />
                <datalist id="sparepart-category-options">
                  {categories.map((category) => (
                    <option key={category.id} value={category.name} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">Kategori baru akan dibuat otomatis saat disimpan.</p>
              </div>
            </div>
          </div>
        </div>

        {!isRetailItem && <div className="border-t pt-2" />}

        {!isRetailItem && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1">
              <div className="h-5 w-1 rounded-full bg-primary" />
              <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <RiDeviceLine className="size-4" />
                Kompatibilitas
              </span>
            </div>

            <div className="flex flex-col gap-4 border-l border-border pl-3 sm:ml-4 sm:pl-4">
              {selectedDevices.length === 0 && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="isUniversal"
                    checked={isUniversal}
                    onCheckedChange={(checked) => setIsUniversal(checked === true)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="isUniversal" className="text-sm leading-relaxed">Universal (dapat digunakan di perangkat apapun)</Label>
                </div>
              )}

              {!isUniversal && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">Perangkat Kompatibel</Label>
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

        <div className="flex flex-col-reverse gap-2 border-t pt-2 sm:flex-row sm:justify-end sm:gap-3">
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
  return <InventoryItemFormDialog {...props} mode="sparepart" />;
}

export function InventoryItemFormDialog(props: InventoryItemFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <SparepartFormContent key={props.sparepart?.id ?? `new-${props.mode}`} {...props} /> : null}
    </Dialog>
  );
}
