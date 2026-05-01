"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  restockSparepart,
  searchSpareparts,
  getStockInHistory,
  type SparepartWithCompatibilities,
} from "@/actions/inventory";
import {
  RiStackLine,
  RiSearchLine,
  RiLoader4Line,
  RiArchiveLine,
  RiCloseLine,
  RiHistoryLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiUserLine,
} from "@remixicon/react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SparepartRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokoId: string;
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

const SCANNER_INPUT_THRESHOLD_MS = 30;

function SparepartRestockDialogContent({
  tokoId,
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
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<StockHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = useRef<number[]>([]);
  const isScannerInputRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDev = process.env.NODE_ENV === "development";

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
        const result = await searchSpareparts(tokoId, value);
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

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      const trimmedValue = inputValue.trim();
      if (trimmedValue.length === 0) {
        setError("Masukkan barcode atau nama sparepart");
        return;
      }

      const qtyValue = parseInt(qty, 10);
      if (isNaN(qtyValue) || qtyValue < 1) {
        setError("Jumlah harus berupa angka positif");
        return;
      }

      if (foundSparepart) {
        await performRestock(foundSparepart.id, qtyValue);
        return;
      }

      setIsSearching(true);
      const result = await searchSpareparts(tokoId, trimmedValue);
      setIsSearching(false);

      if (result.success && result.data && result.data.length > 0) {
        const exactIdMatch = result.data.find((sp) => sp.id === trimmedValue);

        if (exactIdMatch && (isScannerInputRef.current || trimmedValue.match(/^[\w-]{20,}$/))) {
          setSearchResults([]);
          setShowResults(false);
          await performRestock(exactIdMatch.id, qtyValue);
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
        setError("Sparepart tidak ditemukan. Periksa barcode atau nama.");
        setSearchResults([]);
        setShowResults(false);
      }
    }
  };

  const handleSelectSparepart = (sparepart: SparepartWithCompatibilities) => {
    setFoundSparepart(sparepart);
    setSearchResults([]);
    setShowResults(false);
    setInputValue(sparepart.id);
  };

  const performRestock = async (sparepartId: string, qtyValue: number) => {
    setIsLoading(true);
    setError(null);

    const result = await restockSparepart({ id: sparepartId, qty: qtyValue });

    setIsLoading(false);

    if (!result.success) {
      toast.error(result.error || "Gagal menambah stok");
      return;
    }

    if (result.data) {
      onSuccess(result.data);
      void loadHistory();
      setShowHistory(true);
      toast.success(`Stok ${result.data.name} berhasil ditambah +${qtyValue}`, {
        description: `Total stok: ${result.data.stock}`,
      });
      
      if (isScannerInputRef.current) {
        setTimeout(() => {
          resetState();
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 500);
      } else {
        onOpenChange(false);
      }
    }
  };

  const handleRestockClick = async () => {
    if (!foundSparepart) {
      setError("Pilih sparepart terlebih dahulu");
      return;
    }

    const qtyValue = parseInt(qty, 10);
    if (isNaN(qtyValue) || qtyValue < 1) {
      setError("Jumlah harus berupa angka positif");
      return;
    }

    await performRestock(foundSparepart.id, qtyValue);
  };

  const simulateScannerInput = async () => {
    const testId = "007f16eb-d55e-417f-9ced-ca49d8654889";
    isScannerInputRef.current = true;
    setInputValue(testId);
    setFoundSparepart(null);
    setSearchResults([]);
    setShowResults(false);

    setIsSearching(true);
    const result = await searchSpareparts(tokoId, testId);
    setIsSearching(false);

    if (result.success && result.data && result.data.length > 0) {
      const exactIdMatch = result.data.find((sp) => sp.id === testId);
      if (exactIdMatch) {
        const qtyValue = parseInt(qty, 10) || 1;
        await performRestock(exactIdMatch.id, qtyValue);
      } else {
        setSearchResults(result.data);
        setShowResults(true);
      }
    } else {
      setError("Sparepart tidak ditemukan (dev test)");
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RiStackLine className="h-4 w-4" />
          </span>
          Restock Sparepart
        </DialogTitle>
        <DialogDescription>
          Scan barcode atau cari sparepart untuk menambah stok. Scanner akan auto-submit.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {error && (
          <div className="rounded p-3 text-sm text-destructive bg-destructive/10">{error}</div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="barcode-input" className="flex items-center gap-1.5">
              <RiSearchLine className="h-3.5 w-3.5 text-muted-foreground" />
              Barcode / ID / Nama
            </Label>
            <span className="text-muted-foreground text-xs">|</span>
            <Label htmlFor="qty" className="text-xs text-muted-foreground">Qty</Label>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                id="barcode-input"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan barcode atau ketik nama sparepart..."
                disabled={isLoading}
              />
              {isSearching && (
                <RiLoader4Line className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Input
              id="qty"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="1"
              min="1"
              disabled={isLoading}
              className="w-20 shrink-0"
            />
          </div>
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Hasil pencarian</Label>
            <div className="max-h-48 overflow-auto rounded-lg border bg-muted/30 divide-y">
              {searchResults.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => handleSelectSparepart(sp)}
                  className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="font-medium text-sm">{sp.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Stok: {sp.stock} | {formatCurrency(sp.defaultPrice)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showResults && inputValue.length >= 3 && searchResults.length === 0 && !isSearching && (
          <div className="text-sm text-muted-foreground text-center py-2">
            Tidak ditemukan sparepart dengan &quot;{inputValue}&quot;
          </div>
        )}

        {foundSparepart && !showResults && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiArchiveLine className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{foundSparepart.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setFoundSparepart(null);
                  setInputValue("");
                }}
              >
                <RiCloseLine className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Stok saat ini:</span>
              <Badge variant="outline" className={cn(
                foundSparepart.stock <= 0
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200"
                  : foundSparepart.stock <= 5
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200"
                  : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200"
              )}>
                {foundSparepart.stock}
              </Badge>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">{formatCurrency(foundSparepart.defaultPrice)}</span>
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-muted/20">
          <button
            type="button"
            onClick={() => setShowHistory((open) => !open)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-muted/40"
          >
            <span className="flex items-center gap-2">
              <RiHistoryLine className="h-4 w-4 text-muted-foreground" />
              History Stok Masuk
            </span>
            {showHistory ? (
              <RiArrowUpSLine className="h-4 w-4 text-muted-foreground" />
            ) : (
              <RiArrowDownSLine className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showHistory && (
            <div className="max-h-56 overflow-auto border-t">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                  Memuat history...
                </div>
              ) : history.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Belum ada history stok masuk.
                </div>
              ) : (
                <div className="divide-y">
                  {history.map((item) => (
                    <div key={item.id} className="px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.sparepartName || "Sparepart"}</div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <RiUserLine className="h-3 w-3" />
                            <span>{item.userName}</span>
                            <span>|</span>
                            <span>{formatDate(new Date(item.createdAt))}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 bg-primary/10 text-primary border-primary/20">
                          +{item.addedQty}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.previousStock} -&gt; {item.newStock}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isDev && (
        <div className="flex justify-end pb-2">
          <button
            type="button"
            onClick={simulateScannerInput}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            [DEV] Simulate scanner
          </button>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Tutup
        </Button>
        <Button
          type="button"
          onClick={handleRestockClick}
          disabled={isLoading || !foundSparepart}
          className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
        >
          {isLoading ? (
            <RiLoader4Line className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <RiStackLine className="h-4 w-4 mr-1.5" />
          )}
          Tambah Stok
        </Button>
      </DialogFooter>
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
