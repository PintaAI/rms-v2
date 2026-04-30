"use client";

/**
 * AddRepairItemForm - Dialog for adding spareparts or services to a repair task
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
import { cn, formatCurrency } from "@/lib/utils";
import { useFeatureAccess } from "@/components/dashboard/layout/feature-access-context";

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
  const { inventoryEnabled, manualItemsEnabled } = useFeatureAccess();
  
  // Determine default item type based on enabled features
  const defaultItemType = !manualItemsEnabled && inventoryEnabled ? "sparepart" : "manual-sparepart";
  const [itemType, setItemType] = useState<"manual-sparepart" | "manual-service" | "sparepart" | "service">(defaultItemType);
  const [selectedSparepartIds, setSelectedSparepartIds] = useState<string[]>([]);
  const [selectedPricelistIds, setSelectedPricelistIds] = useState<string[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");

  // Get selected item details
  const isManualItem = itemType === "manual-sparepart" || itemType === "manual-service";
  const submittedItemType = itemType === "manual-sparepart" || itemType === "sparepart" ? "sparepart" : "service";
  
  // Filter items based on search query
  const filteredSpareparts = spareparts.filter((sp) =>
    sp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredServicePricelists = servicePricelists.filter((sp) =>
    sp.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const selectedSpareparts = spareparts.filter((s) => selectedSparepartIds.includes(s.id));
  const selectedPricelists = servicePricelists.filter((p) => selectedPricelistIds.includes(p.id));
  const hasSelectedItems = itemType === "sparepart" ? selectedSparepartIds.length > 0 : selectedPricelistIds.length > 0;
  
  // Calculate total price for selected items
  const selectedItemsTotal = itemType === "sparepart"
    ? selectedSpareparts.reduce((sum, sp) => sum + sp.defaultPrice, 0)
    : selectedPricelists.reduce((sum, sp) => sum + sp.defaultPrice, 0);
  const totalWithQuantity = selectedItemsTotal * (parseInt(itemQty, 10) || 1);
  const itemName = isManualItem ? manualName.trim() : itemType === "sparepart" ? selectedSpareparts[0]?.name ?? "" : selectedPricelists[0]?.title ?? "";
  const itemPrice = isManualItem ? manualPrice : "";
  const canSubmit = isManualItem
    ? itemName.length > 0 && !!itemPrice && parseInt(itemPrice, 10) >= 0
    : itemType === "sparepart"
      ? selectedSparepartIds.length > 0
      : selectedPricelistIds.length > 0;

  function resetForm() {
    setItemType(defaultItemType);
    setSelectedSparepartIds([]);
    setSelectedPricelistIds([]);
    setManualName("");
    setManualPrice("");
    setItemQty("1");
    setSearchQuery("");
  }

  function handleOpenChange(value: boolean) {
    if (!value) resetForm();
    onOpenChange(value);
  }

  function handleSparepartSelect(sparepartId: string) {
    setSelectedSparepartIds((prev) => {
      if (prev.includes(sparepartId)) {
        return prev.filter((id) => id !== sparepartId);
      } else {
        return [...prev, sparepartId];
      }
    });
  }

  function handlePricelistSelect(pricelistId: string) {
    setSelectedPricelistIds((prev) => {
      if (prev.includes(pricelistId)) {
        return prev.filter((id) => id !== pricelistId);
      } else {
        return [...prev, pricelistId];
      }
    });
  }

  function handleRemoveSparepart(sparepartId: string) {
    setSelectedSparepartIds((prev) => prev.filter((id) => id !== sparepartId));
  }

  function handleRemovePricelist(pricelistId: string) {
    setSelectedPricelistIds((prev) => prev.filter((id) => id !== pricelistId));
  }

  async function handleAddItem() {
    // Validate that an item is selected
    if (isManualItem && !itemName) {
      onError("Please enter an item name");
      return;
    }
    if (isManualItem && (!itemPrice || parseInt(itemPrice, 10) < 0)) {
      onError("Please enter a valid price");
      return;
    }
    if (itemType === "sparepart" && selectedSparepartIds.length === 0) {
      onError("Please select at least one sparepart from the list");
      return;
    }
    if (itemType === "service" && selectedPricelistIds.length === 0) {
      onError("Please select at least one service from the list");
      return;
    }
    if (!itemQty || parseInt(itemQty, 10) < 1) {
      onError("Please enter a valid quantity");
      return;
    }

    handleOpenChange(false);

    // Add multiple items
    const itemsToAdd = itemType === "sparepart" 
      ? selectedSpareparts 
      : itemType === "service"
        ? selectedPricelists
        : [{ id: "", name: itemName, defaultPrice: parseInt(itemPrice, 10) }];

    try {
      for (const item of itemsToAdd) {
        const itemNameToUse = isManualItem ? itemName : itemType === "sparepart" ? item.name : (item as any).title;
        const itemPriceToUse = isManualItem ? parseInt(itemPrice, 10) : item.defaultPrice;

        // Build the optimistic item and notify the parent immediately
        const newItem = {
          id: `temp-${Date.now()}-${item.id}`,
          type: submittedItemType,
          name: itemNameToUse || "",
          qty: parseInt(itemQty, 10),
          price: itemPriceToUse,
        };
        onAddItem?.(newItem);

        const result = await addItem({
          serviceId,
          type: submittedItemType,
          sparepartId: itemType === "sparepart" ? item.id : undefined,
          servicePricelistId: itemType === "service" ? item.id : undefined,
          name: itemNameToUse || "",
          qty: parseInt(itemQty, 10),
          price: itemPriceToUse,
        });

        if (!result.success) {
          onAddItemError?.();
          onError(result.error || "Failed to add item");
          return;
        }
      }

      onSuccess();
    } catch (err) {
      console.error("Error adding item:", err);
      onAddItemError?.();
      onError("Failed to add item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add Repair Item</DialogTitle>
          <DialogDescription className="text-base">
            Add spareparts or services to this repair task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Item Type Toggle */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Item Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (manualItemsEnabled) {
                    setItemType("manual-sparepart");
                    setSelectedSparepartIds([]);
                    setSelectedPricelistIds([]);
                    setSearchQuery("");
                  }
                }}
                disabled={!manualItemsEnabled}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg border-2 text-base font-medium transition-all",
                  !manualItemsEnabled
                    ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                    : itemType === "manual-sparepart"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                )}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manual Sparepart
              </button>
              <button
                type="button"
                onClick={() => {
                  if (manualItemsEnabled) {
                    setItemType("manual-service");
                    setSelectedSparepartIds([]);
                    setSelectedPricelistIds([]);
                    setSearchQuery("");
                  }
                }}
                disabled={!manualItemsEnabled}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg border-2 text-base font-medium transition-all",
                  !manualItemsEnabled
                    ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                    : itemType === "manual-service"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                )}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Manual Service
              </button>
              <button
                type="button"
                onClick={() => {
                  if (inventoryEnabled) {
                    setItemType("sparepart");
                    setSelectedSparepartIds([]);
                    setSelectedPricelistIds([]);
                    setSearchQuery("");
                  }
                }}
                disabled={!inventoryEnabled}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg border-2 text-base font-medium transition-all",
                  !inventoryEnabled
                    ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                    : itemType === "sparepart"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                )}
              >
                Inventory Sparepart
              </button>
              <button
                type="button"
                onClick={() => {
                  if (inventoryEnabled) {
                    setItemType("service");
                    setSelectedSparepartIds([]);
                    setSelectedPricelistIds([]);
                    setSearchQuery("");
                  }
                }}
                disabled={!inventoryEnabled}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg border-2 text-base font-medium transition-all",
                  !inventoryEnabled
                    ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                    : itemType === "service"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                )}
              >
                Pricelist Service
              </button>
            </div>
          </div>

          {isManualItem && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 sm:col-span-2">
                <Label htmlFor="manual-item-name" className="text-base font-medium">Item Name</Label>
                <Input
                  id="manual-item-name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder={itemType === "manual-sparepart" ? "Contoh: LCD iPhone 11" : "Contoh: Jasa bongkar pasang"}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="manual-item-price" className="text-base font-medium">Price</Label>
                <Input
                  id="manual-item-price"
                  type="number"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  min="0"
                  placeholder="0"
                  className="h-11 text-base"
                />
              </div>
            </div>
          )}

          {/* Item Selection - Card Grid */}
          {!isManualItem && <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-base font-medium">
                {itemType === "sparepart" ? "Select Sparepart" : "Select Service"}
              </Label>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                Required
              </Badge>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                type="text"
                placeholder={itemType === "sparepart" ? "Search spareparts..." : "Search services..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 text-base"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Selected Items Display */}
            {itemType === "sparepart" && selectedSpareparts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Selected ({selectedSpareparts.length})
                  </Label>
                  <span className="text-sm font-semibold text-foreground">
                    Subtotal: {formatCurrency(selectedItemsTotal)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedSpareparts.map((sp) => (
                    <div
                      key={sp.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm"
                    >
                      <span className="font-medium text-primary">{sp.name}</span>
                      <span className="text-xs text-primary/70">{formatCurrency(sp.defaultPrice)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSparepart(sp.id)}
                        className="ml-1 text-primary/70 hover:text-primary"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {itemType === "service" && selectedPricelists.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Selected ({selectedPricelists.length})
                  </Label>
                  <span className="text-sm font-semibold text-foreground">
                    Subtotal: {formatCurrency(selectedItemsTotal)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPricelists.map((sp) => (
                    <div
                      key={sp.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm"
                    >
                      <span className="font-medium text-primary">{sp.title}</span>
                      <span className="text-xs text-primary/70">{formatCurrency(sp.defaultPrice)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePricelist(sp.id)}
                        className="ml-1 text-primary/70 hover:text-primary"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {itemType === "sparepart" && (
              filteredSpareparts.length === 0 ? (
                <div className="flex items-center gap-2 p-5 rounded-lg bg-muted/50 text-base text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  {searchQuery ? "No spareparts found matching your search" : "No spareparts available in inventory"}
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                  {filteredSpareparts.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => sp.stock > 0 && handleSparepartSelect(sp.id)}
                      disabled={sp.stock <= 0}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all",
                        sp.stock <= 0
                          ? "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
                          : selectedSparepartIds.includes(sp.id)
                            ? "border-primary bg-primary/10"
                            : "border-muted bg-background hover:border-muted-foreground/50 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Selection indicator */}
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          selectedSparepartIds.includes(sp.id)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {selectedSparepartIds.includes(sp.id) && (
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-base font-medium block truncate",
                            sp.stock <= 0
                              ? "text-muted-foreground"
                              : selectedSparepartIds.includes(sp.id)
                                ? "text-primary"
                                : "text-foreground"
                          )}>
                            {sp.name}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={cn(
                          "text-sm font-semibold",
                          selectedSparepartIds.includes(sp.id) ? "text-primary" : "text-muted-foreground"
                        )}>
                          {formatCurrency(sp.defaultPrice)}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded font-medium",
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
              filteredServicePricelists.length === 0 ? (
                <div className="flex items-center gap-2 p-5 rounded-lg bg-muted/50 text-base text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  {searchQuery ? "No services found matching your search" : "No services available"}
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                  {filteredServicePricelists.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => handlePricelistSelect(sp.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all",
                        selectedPricelistIds.includes(sp.id)
                          ? "border-primary bg-primary/10"
                          : "border-muted bg-background hover:border-muted-foreground/50 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Selection indicator */}
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          selectedPricelistIds.includes(sp.id)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {selectedPricelistIds.includes(sp.id) && (
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-base font-medium block truncate",
                            selectedPricelistIds.includes(sp.id) ? "text-primary" : "text-foreground"
                          )}>
                            {sp.title}
                          </span>
                        </div>
                      </div>
                      
                      <span className={cn(
                        "text-sm font-semibold flex-shrink-0",
                        selectedPricelistIds.includes(sp.id) ? "text-primary" : "text-muted-foreground"
                      )}>
                        {formatCurrency(sp.defaultPrice)}
                      </span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>}

          {/* Quantity */}
          <div className="space-y-3">
            <Label htmlFor="quantity" className="text-base font-medium">Quantity per Item</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const current = parseInt(itemQty, 10) || 1;
                  if (current > 1) {
                    setItemQty(String(current - 1));
                  }
                }}
                className="w-11 h-11 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <Input
                id="quantity"
                type="number"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                min="1"
                className="w-24 text-center h-11 text-base font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  const current = parseInt(itemQty, 10) || 0;
                  setItemQty(String(current + 1));
                }}
                className="w-11 h-11 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {((isManualItem && itemPrice) || (!isManualItem && hasSelectedItems)) && (
                <div className="ml-auto text-base text-muted-foreground">
                  Total: <span className="font-semibold text-foreground text-lg">
                    {formatCurrency(isManualItem ? (parseInt(itemPrice, 10) || 0) * (parseInt(itemQty, 10) || 1) : totalWithQuantity)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="h-11 px-6 text-base">
            Cancel
          </Button>
          <Button onClick={handleAddItem} disabled={!canSubmit} className="h-11 px-6 text-base">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add {!isManualItem && hasSelectedItems ? `${itemType === "sparepart" ? selectedSparepartIds.length : selectedPricelistIds.length} Item${(itemType === "sparepart" ? selectedSparepartIds.length : selectedPricelistIds.length) > 1 ? "s" : ""}` : "Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
