"use client";

/**
 * AddRepairItemForm - Dialog for adding spareparts or services to a repair task
 *
 * OPTIMISTIC UI CALLBACKS:
 * This form supports optimistic UI updates via three callbacks:
 *
 * 1. `onAddItem` - Called BEFORE the server request with a temp item:
 *    - Receives: { id: `temp-${timestamp}`, type, name, qty, price }
 *    - Parent should: increment pendingMutationsRef, add item to localTask.items
 *    - Dialog closes immediately for instant feedback
 *
 * 2. `onSuccess` - Called AFTER server request succeeds:
 *    - Parent should: decrement pendingMutationsRef, trigger silent re-fetch
 *    - Re-fetch brings the real item (with server ID) replacing the temp item
 *
 * 3. `onAddItemError` - Called if server request fails:
 *    - Parent should: decrement pendingMutationsRef, revert localTask to previous state
 *
 * CRITICAL: `onSuccess` must be called AFTER server success, not before.
 * Calling it too early causes the re-fetch to return stale data (server hasn't saved),
 * and the temp item disappears because pendingMutationsRef === 0 allows sync.
 *
 * EXAMPLE USAGE:
 * ```tsx
 * <AddRepairItemForm
 *   onAddItem={(item) => {
 *     pendingMutationsRef.current += 1;
 *     setLocalTask(prev => ({ ...prev, items: [...prev.items, item] }));
 *   }}
 *   onSuccess={() => {
 *     pendingMutationsRef.current -= 1;
 *     onRefresh?.();  // Silent re-fetch
 *   }}
 *   onAddItemError={() => {
 *     pendingMutationsRef.current -= 1;
 *     setLocalTask(snapshot);  // Revert
 *   }}
 * />
 * ```
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { addItem } from "@/actions";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

interface AddRepairItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  spareparts: Array<{ id: string; name: string; defaultPrice: number; stock: number }>;
  servicePricelists: Array<{ id: string; title: string; defaultPrice: number }>;
  onSuccess: () => void;
  onError: (error: string) => void;
  /** Called immediately before the server request with the optimistic item */
  onAddItem?: (item: { id: string; type: string; name: string; qty: number; price: number }) => void;
  /** Called when the server request fails so the caller can revert the optimistic add */
  onAddItemError?: () => void;
}

export function AddRepairItemForm({
  open,
  onOpenChange,
  serviceId,
  spareparts,
  servicePricelists,
  onSuccess,
  onError,
  onAddItem,
  onAddItemError,
}: AddRepairItemFormProps) {
  const [itemType, setItemType] = useState<"sparepart" | "service">("sparepart");
  const [selectedSparepartId, setSelectedSparepartId] = useState<string>("");
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>("");
  const [itemQty, setItemQty] = useState("1");

  // Get selected item details
  const selectedSparepart = spareparts.find((s) => s.id === selectedSparepartId);
  const selectedPricelist = servicePricelists.find((p) => p.id === selectedPricelistId);
  const selectedItem = itemType === "sparepart" ? selectedSparepart : selectedPricelist;
  const itemName = itemType === "sparepart" ? selectedSparepart?.name : selectedPricelist?.title;
  const itemPrice = selectedItem?.defaultPrice?.toString() || "";

  function resetForm() {
    setItemType("sparepart");
    setSelectedSparepartId("");
    setSelectedPricelistId("");
    setItemQty("1");
  }

  function handleOpenChange(value: boolean) {
    if (!value) resetForm();
    onOpenChange(value);
  }

  function handleSparepartSelect(sparepartId: string) {
    setSelectedSparepartId(sparepartId);
  }

  function handlePricelistSelect(pricelistId: string) {
    setSelectedPricelistId(pricelistId);
  }

  async function handleAddItem() {
    // Validate that an item is selected
    if (itemType === "sparepart" && !selectedSparepartId) {
      onError("Please select a sparepart from the list");
      return;
    }
    if (itemType === "service" && !selectedPricelistId) {
      onError("Please select a service from the list");
      return;
    }
    if (!itemQty || parseInt(itemQty, 10) < 1) {
      onError("Please enter a valid quantity");
      return;
    }

    // Build the optimistic item and notify the parent immediately
    const newItem = {
      id: `temp-${Date.now()}`,
      type: itemType,
      name: itemName || "",
      qty: parseInt(itemQty, 10),
      price: parseInt(itemPrice, 10),
    };
    onAddItem?.(newItem);

    handleOpenChange(false);

    try {
      const result = await addItem({
        serviceId,
        type: itemType,
        sparepartId: itemType === "sparepart" ? selectedSparepartId : undefined,
        name: itemName || "",
        qty: parseInt(itemQty, 10),
        price: parseInt(itemPrice, 10),
      });

      if (result.success) {
        onSuccess();
      } else {
        onAddItemError?.();
        onError(result.error || "Failed to add item");
      }
    } catch (err) {
      console.error("Error adding item:", err);
      onAddItemError?.();
      onError("Failed to add item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Repair Item</DialogTitle>
          <DialogDescription>
            Add spareparts or services to this repair task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Item Type Toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Item Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setItemType("sparepart");
                  setSelectedSparepartId("");
                  setSelectedPricelistId("");
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                  itemType === "sparepart"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted bg-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Sparepart
              </button>
              <button
                type="button"
                onClick={() => {
                  setItemType("service");
                  setSelectedSparepartId("");
                  setSelectedPricelistId("");
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                  itemType === "service"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted bg-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Service
              </button>
            </div>
          </div>

          {/* Item Selection - Card Grid */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-medium">
                {itemType === "sparepart" ? "Select Sparepart" : "Select Service"}
              </Label>
              <Badge variant="secondary" className="text-[10px] px-1">
                Required
              </Badge>
            </div>
            
            {itemType === "sparepart" && (
              spareparts.length === 0 ? (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  No spareparts available in inventory
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                  {spareparts.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => sp.stock > 0 && handleSparepartSelect(sp.id)}
                      disabled={sp.stock <= 0}
                      className={cn(
                        "group relative flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all",
                        sp.stock <= 0
                          ? "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
                          : selectedSparepartId === sp.id
                            ? "border-primary bg-primary/10"
                            : "border-muted bg-background hover:border-muted-foreground/50 hover:bg-muted/30"
                      )}
                    >
                      {/* Selection indicator */}
                      {selectedSparepartId === sp.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      
                      <span className={cn(
                        "text-sm font-medium line-clamp-1",
                        sp.stock <= 0
                          ? "text-muted-foreground"
                          : selectedSparepartId === sp.id
                            ? "text-primary"
                            : "text-foreground"
                      )}>
                        {sp.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-xs",
                          selectedSparepartId === sp.id ? "text-primary/70" : "text-muted-foreground"
                        )}>
                          {formatCurrency(sp.defaultPrice)}
                        </span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded",
                          sp.stock > 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {sp.stock <= 0 ? "Out of stock" : `Stok: ${sp.stock}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}

            {itemType === "service" && (
              servicePricelists.length === 0 ? (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  No services available
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                  {servicePricelists.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => handlePricelistSelect(sp.id)}
                      className={cn(
                        "group relative flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all",
                        selectedPricelistId === sp.id
                          ? "border-primary bg-primary/10"
                          : "border-muted bg-background hover:border-muted-foreground/50 hover:bg-muted/30"
                      )}
                    >
                      {/* Selection indicator */}
                      {selectedPricelistId === sp.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      
                      <span className={cn(
                        "text-sm font-medium line-clamp-1",
                        selectedPricelistId === sp.id ? "text-primary" : "text-foreground"
                      )}>
                        {sp.title}
                      </span>
                      <span className={cn(
                        "text-xs mt-1",
                        selectedPricelistId === sp.id ? "text-primary/70" : "text-muted-foreground"
                      )}>
                        {formatCurrency(sp.defaultPrice)}
                      </span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-sm font-medium">Quantity</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const current = parseInt(itemQty, 10) || 1;
                  if (current > 1) {
                    setItemQty(String(current - 1));
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <Input
                id="quantity"
                type="number"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                min="1"
                className="w-20 text-center h-10"
              />
              <button
                type="button"
                onClick={() => {
                  const current = parseInt(itemQty, 10) || 0;
                  setItemQty(String(current + 1));
                }}
                className="w-10 h-10 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {selectedItem && (
                <div className="ml-auto text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{formatCurrency((parseInt(itemPrice, 10) || 0) * (parseInt(itemQty, 10) || 1))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddItem} disabled={!selectedSparepartId && !selectedPricelistId}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
