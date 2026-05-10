"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  restockSparepart,
  searchSpareparts,
  getStockInHistory,
  type InventoryItemKind,
  type SparepartWithCompatibilities,
} from "@/actions/inventory";
import {
  RiStackLine,
  RiSearchLine,
  RiLoader4Line,
  RiArchiveLine,
  RiCloseLine,
  RiHistoryLine,
  RiUserLine,
  RiBarcodeLine,
  RiNumbersLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useScannerPairing, ScannerPairingPanel, ScannerToggleButton } from "@/components/shared/scanner-pairing";

interface SparepartRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokoId: string;
  itemKind?: InventoryItemKind;
  onSuccess: (updatedSparepart: SparepartWithCompatibilities) => void;
}

interface StockHistoryItem {
  id: string;
  createdAt: Date;
  sparepartId: string;
  sparepartName: string;
  previousStock: number;
  addedQty: number;
  newStock: number;
  userName: string;
}

interface RestockItem {
  sparepart: SparepartWithCompatibilities;
  qty: number;
}

const SCANNER_INPUT_THRESHOLD_MS = 30;

const getRestockPrice = (sparepart: SparepartWithCompatibilities) =>
  sparepart.purchasePrice ?? 0;

function SparepartRestockDialogContent({
  tokoId,
  itemKind = "sparepart",
  onOpenChange,
  onSuccess,
}: Omit<SparepartRestockDialogProps, "open">) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [qty, setQty] = useState("1");
  const [foundSparepart, setFoundSparepart] = useState<SparepartWithCompatibilities | null>(null);
  const [searchResults, setSearchResults] = useState<SparepartWithCompatibilities[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [history, setHistory] = useState<StockHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = useRef<number[]>([]);
  const isScannerInputRef = useRef(false);
  const isProcessingScannerRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDev = process.env.NODE_ENV === "development";
  const itemLabel = itemKind === "retail_item" ? "barang retail" : "sparepart";
  const titleLabel = itemKind === "retail_item" ? "Barang Retail" : "Sparepart";
  const totalRestockPrice = restockItems.reduce(
    (total, item) => total + getRestockPrice(item.sparepart) * item.qty,
    0
  );

  const resetState = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setInputValue("");
    setQty("1");
    setFoundSparepart(null);
    setSearchResults([]);
    setShowResults(false);
    setError(null);
    isScannerInputRef.current = false;
    lastKeyTimeRef.current = [];
  }, []);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    const result = await getStockInHistory(tokoId, 15);
    setIsLoadingHistory(false);
    if (result.success && result.data) {
      setHistory(result.data);
    }
  }, [tokoId]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    const historyTimeout = window.setTimeout(() => {
      void loadHistory();
    }, 0);
    return () => {
      window.clearTimeout(historyTimeout);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [loadHistory]);

  const detectScannerInput = useCallback(() => {
    const now = Date.now();
    lastKeyTimeRef.current.push(now);
    
    if (lastKeyTimeRef.current.length > 10) {
      lastKeyTimeRef.current = lastKeyTimeRef.current.slice(-10);
    }

    if (lastKeyTimeRef.current.length >= 3) {
      const gaps = lastKeyTimeRef.current.slice(1).map((t, i) => t - lastKeyTimeRef.current[i]);
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (avgGap < SCANNER_INPUT_THRESHOLD_MS) {
        isScannerInputRef.current = true;
      }
    }
  }, []);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setError(null);
    setFoundSparepart(null);
    detectScannerInput();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length === 0) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (value.length >= 2) {
      setShowResults(true);
      setIsSearching(true);

      searchTimeoutRef.current = setTimeout(async () => {
        const result = await searchSpareparts(tokoId, value, itemKind);
        setIsSearching(false);

        if (result.success && result.data) {
          if (result.data.length === 1 && result.data[0].id === value) {
            setFoundSparepart(result.data[0]);
            setSearchResults([]);
            setShowResults(false);
          } else {
            setSearchResults(result.data);
          }
        } else {
          setSearchResults([]);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
    }
  };

  const addRestockItem = useCallback((sparepart: SparepartWithCompatibilities, qtyValue: number) => {
    setRestockItems((items) => {
      const existingItem = items.find((item) => item.sparepart.id === sparepart.id);
      if (existingItem) {
        return items.map((item) =>
          item.sparepart.id === sparepart.id ? { ...item, qty: item.qty + qtyValue } : item
        );
      }

      return [...items, { sparepart, qty: qtyValue }];
    });

    toast.success(`${sparepart.name} ditambahkan ke daftar restock +${qtyValue}`, {
      description: `Subtotal: ${formatCurrency(getRestockPrice(sparepart) * qtyValue)}`,
    });

    resetState();
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [resetState]);

  const submitRestockItems = useCallback(async () => {
    if (restockItems.length === 0) {
      setError(`Tambahkan minimal 1 ${itemLabel} ke daftar restock`);
      return;
    }

    setIsLoading(true);
    setError(null);

    const updatedSpareparts: SparepartWithCompatibilities[] = [];

    for (const item of restockItems) {
      const result = await restockSparepart({ id: item.sparepart.id, qty: item.qty });

      if (!result.success) {
        setIsLoading(false);
        toast.error(result.error || `Gagal menambah stok ${item.sparepart.name}`);
        return;
      }

      if (result.data) {
        updatedSpareparts.push(result.data);
      }
    }

    setIsLoading(false);

    for (const updatedSparepart of updatedSpareparts) {
      onSuccess(updatedSparepart);
    }

    void loadHistory();
    toast.success(`${restockItems.length} ${itemLabel} berhasil direstock`, {
      description: `Total harga: ${formatCurrency(totalRestockPrice)}`,
    });
    setRestockItems([]);
    onOpenChange(false);
  }, [loadHistory, onOpenChange, onSuccess, restockItems, totalRestockPrice]);

  const processScannerValue = useCallback(async (rawValue: string) => {
    if (isProcessingScannerRef.current) return;

    isProcessingScannerRef.current = true;

    try {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      const trimmedValue = rawValue.trim();
      setInputValue(trimmedValue);
      if (trimmedValue.length === 0) {
        setError(`Masukkan barcode atau nama ${itemLabel}`);
        return;
      }

      const qtyValue = parseInt(qty, 10);
      if (isNaN(qtyValue) || qtyValue < 1) {
        setError("Jumlah harus berupa angka positif");
        return;
      }

      if (foundSparepart && !isScannerInputRef.current) {
        addRestockItem(foundSparepart, qtyValue);
        return;
      }

      setIsSearching(true);
      const result = await searchSpareparts(tokoId, trimmedValue, itemKind);
      setIsSearching(false);

      if (result.success && result.data && result.data.length > 0) {
        const exactIdentifierMatch = result.data.find(
          (sp) => sp.id === trimmedValue || sp.barcode.toLowerCase() === trimmedValue.toLowerCase()
        );

        if (exactIdentifierMatch && (isScannerInputRef.current || trimmedValue.match(/^[\w-]{6,}$/))) {
          setSearchResults([]);
          setShowResults(false);
          addRestockItem(exactIdentifierMatch, qtyValue);
        } else if (result.data.length === 1) {
          setFoundSparepart(result.data[0]);
          setSearchResults([]);
          setShowResults(false);
        } else {
          setSearchResults(result.data);
          setShowResults(true);
          setError(null);
        }
      } else {
        setError(`${titleLabel} tidak ditemukan. Periksa barcode atau nama.`);
        setSearchResults([]);
        setShowResults(false);
      }
    } finally {
      isProcessingScannerRef.current = false;
    }
  }, [addRestockItem, foundSparepart, itemKind, itemLabel, qty, titleLabel, tokoId]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await processScannerValue(inputValue);
    }
  };

  const handleMobileScan = useCallback(async (value: string) => {
    isScannerInputRef.current = true;
    await processScannerValue(value);
  }, [processScannerValue]);

  const scanner = useScannerPairing({ tokoId, onScan: handleMobileScan });

  const handleSelectSparepart = (sparepart: SparepartWithCompatibilities) => {
    setFoundSparepart(sparepart);
    setSearchResults([]);
    setShowResults(false);
    setInputValue(sparepart.id);
  };

  const handleRestockClick = async () => {
    if (!foundSparepart) {
      setError(`Pilih ${itemLabel} terlebih dahulu`);
      return;
    }

    const qtyValue = parseInt(qty, 10);
    if (isNaN(qtyValue) || qtyValue < 1) {
      setError("Jumlah harus berupa angka positif");
      return;
    }

    addRestockItem(foundSparepart, qtyValue);
  };

  const simulateScannerInput = async () => {
    const testId = "007f16eb-d55e-417f-9ced-ca49d8654889";
    isScannerInputRef.current = true;
    setFoundSparepart(null);
    setSearchResults([]);
    setShowResults(false);
    await processScannerValue(testId);
  };

  return (
    <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <RiStackLine className="size-4" />
          </span>
          Restock {titleLabel}
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <svg className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1">
              <div className="h-5 w-1 rounded-full bg-primary" />
              <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <RiSearchLine className="size-4" />
                Cari {titleLabel}
              </span>
            </div>
            {scanner.enabled && (
              <div className="flex items-center gap-2">
                <ScannerToggleButton
                  isOpen={scanner.isOpen}
                  onToggle={() => scanner.setIsOpen((open) => !open)}
                  state={scanner.state}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 border-l border-border pl-3 sm:ml-4 sm:pl-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="barcode-input" className="flex items-center gap-1.5 text-sm">
                    <RiBarcodeLine className="size-3.5" />
                    Barcode / ID / Nama
                  </Label>
                  <span className="text-sm leading-none text-destructive">*</span>
                </div>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="barcode-input"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Scan barcode atau ketik nama ${itemLabel}...`}
                    disabled={isLoading}
                  />
                  {isSearching && (
                    <RiLoader4Line className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="qty" className="flex items-center gap-1.5 text-sm">
                    <RiNumbersLine className="size-3.5" />
                    Jumlah
                  </Label>
                  <span className="text-sm leading-none text-destructive">*</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="qty"
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="1"
                    min="1"
                    disabled={isLoading}
                    className="sm:flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRestockClick}
                    disabled={isLoading || !foundSparepart}
                    className="sm:shrink-0"
                  >
                    Tambah ke Daftar
                  </Button>
                </div>
              </div>
            </div>

            {scanner.enabled && scanner.isOpen && scanner.state !== "connected" && (
              <ScannerPairingPanel host={scanner} onClose={() => scanner.setIsOpen(false)} className="mt-1" />
            )}
          </div>
        </div>

        {showResults && searchResults.length > 0 && (
          <>
            <div className="border-t pt-2" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  <RiArchiveLine className="size-4" />
                  Hasil Pencarian
                </span>
              </div>
              <div className="border-l border-border pl-3 sm:ml-4 sm:pl-4">
                <ScrollArea className="h-40 sm:h-48">
                  <div className="space-y-0 rounded-lg border bg-muted/30 divide-y">
                    {searchResults.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => handleSelectSparepart(sp)}
                        className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="font-medium text-sm">{sp.name}</div>
                        <div className="mt-0.5 break-all text-xs text-muted-foreground sm:break-normal">
                          {sp.barcode} | Stok: {sp.stock} | Harga beli: {formatCurrency(getRestockPrice(sp))}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </>
        )}

        {showResults && inputValue.length >= 3 && searchResults.length === 0 && !isSearching && (
          <div className="text-center text-sm text-muted-foreground py-2">
            Tidak ada perangkat yang ditemukan dengan &quot;{inputValue}&quot;
          </div>
        )}

        {foundSparepart && !showResults && (
          <>
            <div className="border-t pt-2" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  <RiArchiveLine className="size-4" />
                  {titleLabel} Dipilih
                </span>
              </div>
              <div className="border-l border-border pl-3 sm:ml-4 sm:pl-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <RiArchiveLine className="size-4 text-muted-foreground" />
                      <span className="min-w-0 break-words font-medium">{foundSparepart.name}</span>
                      <Badge variant="outline">{foundSparepart.barcode}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setFoundSparepart(null);
                        setInputValue("");
                      }}
                      disabled={isLoading}
                    >
                      <RiCloseLine className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm sm:gap-3">
                    <span className="text-muted-foreground">Stok saat ini:</span>
                    <Badge variant="outline" className={cn(
                      foundSparepart.stock <= 0
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200"
                        : foundSparepart.stock <= foundSparepart.criticalStock
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200"
                          : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200"
                    )}>
                      {foundSparepart.stock}
                    </Badge>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-muted-foreground">Harga beli: {formatCurrency(getRestockPrice(foundSparepart))}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {restockItems.length > 0 && (
          <>
            <div className="border-t pt-2" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  <RiStackLine className="size-4" />
                  Daftar Restock
                </span>
              </div>
              <div className="border-l border-border pl-3 sm:ml-4 sm:pl-4">
                <div className="overflow-hidden rounded-lg border bg-muted/20">
                  <div className="divide-y">
                    {restockItems.map((item) => {
                      const price = getRestockPrice(item.sparepart);
                      return (
                        <div key={item.sparepart.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="break-words text-sm font-medium">{item.sparepart.name}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span>Harga beli: {formatCurrency(price)}</span>
                              <span>|</span>
                              <span>Qty: {item.qty}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <div className="text-sm font-semibold tabular-nums">
                              {formatCurrency(price * item.qty)}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                setRestockItems((items) =>
                                  items.filter((currentItem) => currentItem.sparepart.id !== item.sparepart.id)
                                )
                              }
                              disabled={isLoading}
                            >
                              <RiDeleteBinLine className="size-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t bg-background/70 px-3 py-2 text-sm">
                    <span className="font-medium text-muted-foreground">Total harga</span>
                    <span className="font-bold tabular-nums">{formatCurrency(totalRestockPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="border-t pt-2" />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <RiHistoryLine className="size-4" />
              History Stok Masuk
            </span>
          </div>

          <div className="border-l border-border pl-3 sm:ml-4 sm:pl-4">
            <ScrollArea className="h-44 rounded-md border bg-muted/20 sm:h-50">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <RiLoader4Line className="mr-2 size-4 animate-spin" />
                  Memuat history...
                </div>
              ) : history.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Belum ada history stok masuk.
                </div>
              ) : (
                <div className="divide-y">
                  {history.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.sparepartName || titleLabel}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <RiUserLine className="size-3" />
                          <span>{item.userName}</span>
                          <span>|</span>
                          <span>{formatDate(new Date(item.createdAt))}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          +{item.addedQty}
                        </Badge>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {item.previousStock} → {item.newStock}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="text-destructive">*</span> Menandakan kolom yang wajib diisi
        </p>

        {isDev && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={simulateScannerInput}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              [DEV] Simulate scanner
            </button>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t pt-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Tutup
          </Button>
          <Button
            type="button"
            onClick={submitRestockItems}
            disabled={isLoading || restockItems.length === 0}
            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
          >
            {isLoading ? (
              <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
            ) : (
              <RiStackLine className="mr-1.5 size-4" />
            )}
            Simpan Restock
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export function SparepartRestockDialog(props: SparepartRestockDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <SparepartRestockDialogContent key={props.tokoId} {...props} /> : null}
    </Dialog>
  );
}
