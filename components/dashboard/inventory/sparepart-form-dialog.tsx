"use client";

/**
 * SparepartFormDialog - Form dialog for creating/updating spareparts
 */

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSparepart,
  updateSparepart,
  type SparepartWithCompatibilities,
} from "@/actions/inventory";
import { MultiDeviceInput, type HpCatalogOption } from "@/components/shared/multi-device-input";

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
  sparepart,
  tokoId,
  onOpenChange,
  onOptimisticCreate,
  onOptimisticUpdate,
  onRevertCreate,
  onRevertUpdate,
  onSuccess,
}: Omit<SparepartFormProps, "open">) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(sparepart?.name ?? "");
  const [defaultPrice, setDefaultPrice] = useState(sparepart ? sparepart.defaultPrice.toString() : "");
  const [stock, setStock] = useState(sparepart ? sparepart.stock.toString() : "");
  const [isUniversal, setIsUniversal] = useState(sparepart?.isUniversal ?? false);
  const [selectedDevices, setSelectedDevices] = useState<HpCatalogOption[]>(() => toDeviceOptions(sparepart));
  const sparepartRef = useRef(sparepart);
  const lastSubmitRef = useRef<{
    name: string;
    defaultPrice: number;
    stock: number;
    isUniversal: boolean;
    hpCatalogIds: string[];
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = parseInt(defaultPrice, 10);
    if (isNaN(price) || price < 0) {
      setError("Price must be a valid number");
      return;
    }

    const stockValue = parseInt(stock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      setError("Stock must be a valid number");
      return;
    }

    const hpCatalogIds = selectedDevices.map((d) => d.id);
    const finalIsUniversal = hpCatalogIds.length === 0 ? true : isUniversal;

    lastSubmitRef.current = {
      name,
      defaultPrice: price,
      stock: stockValue,
      isUniversal: finalIsUniversal,
      hpCatalogIds,
    };

    const tempId = sparepart?.id || `temp-${Date.now()}`;
    const optimisticSparepart: SparepartWithCompatibilities = {
      id: tempId,
      name,
      defaultPrice: price,
      stock: stockValue,
      isUniversal: finalIsUniversal,
      tokoId,
      compatibilities: selectedDevices.map((d) => ({
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
          stock: stockValue,
          isUniversal: finalIsUniversal,
          hpCatalogIds,
        })
      : await createSparepart({
          name,
          defaultPrice: price,
          stock: stockValue,
          isUniversal: finalIsUniversal,
          tokoId,
          hpCatalogIds,
        });

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Failed to save sparepart");
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
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{sparepart ? "Edit Sparepart" : "Add Sparepart"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          {error && <div className="rounded p-3 text-sm text-destructive bg-destructive/10">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., LCD iPhone 13" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Default Price</Label>
            <Input id="price" type="number" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} placeholder="0" min="0" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" min="0" required />
          </div>
          {selectedDevices.length === 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox id="isUniversal" checked={isUniversal} onCheckedChange={(checked) => setIsUniversal(checked === true)} />
              <Label htmlFor="isUniversal">Universal (can be used on any device)</Label>
            </div>
          )}
          {!isUniversal && (
            <div className="space-y-2">
              <Label>Compatible Devices</Label>
              <MultiDeviceInput
                value={selectedDevices}
                onChange={(devices) => {
                  setSelectedDevices(devices);
                  if (devices.length > 0) {
                    setIsUniversal(false);
                  }
                }}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Search and select device models this sparepart is compatible with.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : sparepart ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function SparepartFormDialog(props: SparepartFormProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <SparepartFormContent key={props.sparepart?.id ?? "new-sparepart"} {...props} /> : null}
    </Dialog>
  );
}
