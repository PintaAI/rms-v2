"use client";

/**
 * SparepartFormDialog - Form dialog for creating/updating spareparts
 *
 * OPTIMISTIC UI ARCHITECTURE (follows dev-docs/optimistic-ui-guide.md):
 *
 * This form supports optimistic UI updates via callbacks:
 *
 * CREATE:
 * - onOptimisticCreate(tempSparepart): Called BEFORE server request
 * - onSuccess(realSparepart?): Called AFTER server success
 * - onRevertCreate(): Called on failure to signal revert needed
 *
 * UPDATE:
 * - onOptimisticUpdate(updatedSparepart): Called BEFORE server request
 * - onSuccess(realSparepart?): Called AFTER server success
 * - onRevertUpdate(): Called on failure to signal revert needed
 *
 * The parent component should:
 * - Track pendingMutationsRef counter
 * - Apply optimistic state on onOptimisticCreate/onOptimisticUpdate
 * - Decrement counter and refresh on onSuccess
 * - Revert state on onRevertCreate/onRevertUpdate
 */

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

export function SparepartFormDialog({
  open,
  onOpenChange,
  sparepart,
  tokoId,
  onOptimisticCreate,
  onOptimisticUpdate,
  onRevertCreate,
  onRevertUpdate,
  onSuccess,
}: SparepartFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [stock, setStock] = useState("");
  const [isUniversal, setIsUniversal] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<HpCatalogOption[]>([]);

  const sparepartRef = useRef(sparepart);

  useEffect(() => {
    sparepartRef.current = sparepart;
  }, [sparepart]);

  const lastSubmitRef = useRef<{
    name: string;
    defaultPrice: number;
    stock: number;
    isUniversal: boolean;
    hpCatalogIds: string[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      if (sparepart) {
        setName(sparepart.name);
        setDefaultPrice(sparepart.defaultPrice.toString());
        setStock(sparepart.stock.toString());
        setIsUniversal(sparepart.isUniversal);
        setSelectedDevices(
          sparepart.compatibilities.map((c) => ({
            id: c.hpCatalog.id,
            modelName: c.hpCatalog.modelName,
            brandName: c.hpCatalog.brand.name,
          }))
        );
      } else {
        setName("");
        setDefaultPrice("");
        setStock("");
        setIsUniversal(false);
        setSelectedDevices([]);
      }
      setError(null);
      lastSubmitRef.current = null;
    }
  }, [sparepart, open]);

  useEffect(() => {
    if (selectedDevices.length > 0 && isUniversal) {
      setIsUniversal(false);
    }
  }, [selectedDevices.length, isUniversal]);

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

    const optimisticSparepart: SparepartWithCompatibilities = {
      id: sparepart?.id || `temp-${Date.now()}`,
      name,
      defaultPrice: price,
      stock: stockValue,
      isUniversal: finalIsUniversal,
      tokoId,
      compatibilities: selectedDevices.map((d) => ({
        hpCatalogId: d.id,
        sparepartId: sparepart?.id || `temp-${Date.now()}`,
        hpCatalog: {
          id: d.id,
          modelName: d.modelName,
          brand: { id: "", name: d.brandName },
        },
      })),
    };

    const isEditMode = sparepartRef.current;

    if (!isEditMode && onOptimisticCreate) {
      onOptimisticCreate(optimisticSparepart);
      onOpenChange(false);
    }

    if (isEditMode && onOptimisticUpdate) {
      onOptimisticUpdate(optimisticSparepart);
      onOpenChange(false);
    }

    setIsLoading(true);

    let result;
    if (sparepartRef.current) {
      result = await updateSparepart({
        id: sparepartRef.current.id,
        name,
        defaultPrice: price,
        stock: stockValue,
        isUniversal: finalIsUniversal,
        hpCatalogIds,
      });
    } else {
      result = await createSparepart({
        name,
        defaultPrice: price,
        stock: stockValue,
        isUniversal: finalIsUniversal,
        tokoId,
        hpCatalogIds,
      });
    }

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Failed to save sparepart");
      if (!sparepartRef.current && onRevertCreate) {
        onRevertCreate();
      }
      if (sparepartRef.current && onRevertUpdate) {
        onRevertUpdate();
      }
    } else if (result.data) {
      onSuccess(result.data);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sparepart ? "Edit Sparepart" : "Add Sparepart"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., LCD iPhone 13"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Default Price</Label>
              <Input
                id="price"
                type="number"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                placeholder="0"
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                min="0"
                required
              />
            </div>
            {selectedDevices.length === 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isUniversal"
                  checked={isUniversal}
                  onCheckedChange={(checked) => setIsUniversal(checked === true)}
                />
                <Label htmlFor="isUniversal">
                  Universal (can be used on any device)
                </Label>
              </div>
            )}
            {!isUniversal && (
              <div className="space-y-2">
                <Label>Compatible Devices</Label>
                <MultiDeviceInput
                  value={selectedDevices}
                  onChange={setSelectedDevices}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Search and select device models this sparepart is compatible with.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : sparepart ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}