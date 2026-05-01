"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createService, updateService } from "@/actions";
import type { ServiceListItem as ServiceListItemType } from "@/actions";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table";
import { loadDeviceCatalog, refreshDeviceCatalogIfStale } from "@/lib/device-catalog-cache";
import { validateIndonesianWhatsappNumber } from "@/lib/whatsapp-number";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PatternLock } from "@/components/shared/pattern-lock";
import { DeviceInput, type HpCatalogOption } from "@/components/shared/device-input";
import { RiUserLine, RiToolsLine, RiTicketLine, RiWhatsappLine, RiBox3Line, RiAddLine, RiDeleteBinLine, RiCloseLine, RiMessage3Line } from "@remixicon/react";

interface ServiceFormData {
  id: string;
  hpCatalogId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  includedItems?: string[];
  passwordPattern: string | null;
  imei: string | null;
  hpCatalog: {
    modelName: string;
    brand: {
      name: string;
    };
  };
}

interface ServicesFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: ServiceFormData | ServiceListItemType | ServiceTableItem | null;
  tokoId?: string;
  onOptimisticCreate?: (tempService: ServiceListItemType) => void;
  onOptimisticUpdate?: (updatedService: ServiceListItemType) => void;
  onRevertCreate?: (tempId: string) => void;
  onRevertUpdate?: (originalService: ServiceListItemType) => void;
}

type FormSnapshot = {
  isEditMode: boolean;
  selectedDevice: HpCatalogOption | null;
  customerName: string;
  noWa: string;
  complaint: string;
  includedItems: string[];
  imei: string;
  passwordPatternText: string;
  pattern: number[];
  showPatternLock: boolean;
  dpAmount: string;
};

function getInitialFormState(editData?: ServiceFormData | ServiceListItemType | ServiceTableItem | null): FormSnapshot {
  if (!editData) {
    return {
      isEditMode: false,
      selectedDevice: null,
      customerName: "",
      noWa: "",
      complaint: "",
      includedItems: ["1 HP"],
      imei: "",
      passwordPatternText: "",
      pattern: [],
      showPatternLock: false,
      dpAmount: "",
    };
  }

  const passwordPattern = editData.passwordPattern || "";
  const isPattern = passwordPattern !== "" && /^[\d-]+$/.test(passwordPattern);

  return {
    isEditMode: true,
    selectedDevice: {
      id: editData.hpCatalogId || "",
      modelName: editData.hpCatalog.modelName,
      brandName: editData.hpCatalog.brand.name,
    },
    customerName: editData.customerName || "",
    noWa: editData.noWa || "",
    complaint: editData.complaint || "",
    includedItems: (editData as ServiceFormData).includedItems || [],
    imei: editData.imei || "",
    passwordPatternText: isPattern ? "" : passwordPattern,
    pattern: isPattern ? passwordPattern.split("-").map(Number) : [],
    showPatternLock: isPattern,
    dpAmount: (editData as ServiceTableItem).invoice?.dpAmount?.toString() || "",
  };
}

function formatRupiahAmount(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function ServicesFormContent({
  onOpenChange,
  onSuccess,
  editData,
  tokoId,
  onOptimisticCreate,
  onOptimisticUpdate,
  onRevertCreate,
  onRevertUpdate,
}: Omit<ServicesFormProps, "open">) {
  const initialState = getInitialFormState(editData);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<HpCatalogOption | null>(initialState.selectedDevice);
  const [customerName, setCustomerName] = useState(initialState.customerName);
  const [noWa, setNoWa] = useState(initialState.noWa);
  const [complaint, setComplaint] = useState(initialState.complaint);
  const [includedItems, setIncludedItems] = useState<string[]>(initialState.includedItems);
  const [newItem, setNewItem] = useState("");
  const [imei, setImei] = useState(initialState.imei);
  const [passwordPatternText, setPasswordPatternText] = useState(initialState.passwordPatternText);
  const [pattern, setPattern] = useState<number[]>(initialState.pattern);
  const [showPatternLock, setShowPatternLock] = useState(initialState.showPatternLock);
  const [dpAmount, setDpAmount] = useState(initialState.dpAmount);
  const [patternError, setPatternError] = useState(false);
  const [patternResetKey, setPatternResetKey] = useState(0);
  const [devices, setDevices] = useState<HpCatalogOption[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const formattedDpAmount = formatRupiahAmount(dpAmount);

  useEffect(() => {
    let active = true;

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
  }, []);

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

  const clearPattern = useCallback(() => {
    setPattern([]);
    setPatternError(false);
    setPatternResetKey((prev) => prev + 1);
  }, []);

  const addItem = useCallback(() => {
    if (newItem.trim() && !includedItems.includes(newItem.trim())) {
      setIncludedItems((prev) => [...prev, newItem.trim()]);
      setNewItem("");
    }
  }, [newItem, includedItems]);

  const removeItem = useCallback((index: number) => {
    setIncludedItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePatternComplete = useCallback((newPattern: number[]) => {
    setPattern(newPattern);
    setPatternError(false);
  }, []);

  const patternToString = useCallback((p: number[]) => (p.length > 0 ? p.join("-") : ""), []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDeviceError(null);

    if (!selectedDevice) {
      setDeviceError("Pilih atau masukkan perangkat");
      return;
    }

    const whatsappValidation = validateIndonesianWhatsappNumber(noWa);
    if (!whatsappValidation.valid) {
      setError(whatsappValidation.error);
      return;
    }

    if (!complaint.trim()) {
      setError("Keluhan wajib diisi");
      return;
    }

    const passwordPatternValue = showPatternLock && pattern.length > 0 ? patternToString(pattern) : passwordPatternText;
    const dpAmountNum = parseInt(dpAmount, 10);
    const payload = {
      hpCatalogId: selectedDevice.id,
      customerName: customerName || undefined,
      noWa: noWa.trim(),
      complaint,
      includedItems: includedItems.length > 0 ? includedItems : undefined,
      passwordPattern: passwordPatternValue || undefined,
      imei: imei || undefined,
      dpAmount: (!isNaN(dpAmountNum) && dpAmountNum > 0) ? dpAmountNum : undefined,
    };

    const tempId = `temp-${Date.now()}`;
    const now = new Date();

    if (!initialState.isEditMode && onOptimisticCreate) {
      onOptimisticCreate({
        id: tempId,
        hpCatalogId: selectedDevice.id,
        customerName: customerName || null,
        noWa: noWa.trim(),
        complaint,
        includedItems: includedItems.length > 0 ? includedItems : null,
        note: null,
        status: "received",
        checkinAt: now,
        doneAt: null,
        checkoutAt: null,
        passwordPattern: passwordPatternValue || null,
        imei: imei || null,
        hpCatalog: {
          id: selectedDevice.id,
          modelName: selectedDevice.modelName,
          brand: { name: selectedDevice.brandName },
        },
        technician: null,
        createdBy: undefined,
        invoice: null,
      });
      onOpenChange(false);
    }

    if (initialState.isEditMode && editData && onOptimisticUpdate) {
      const existingData = editData as ServiceListItemType;
      onOptimisticUpdate({
        id: editData.id,
        hpCatalogId: selectedDevice.id,
        customerName: customerName || null,
        noWa: noWa.trim(),
        complaint,
        includedItems: includedItems.length > 0 ? includedItems : null,
        note: existingData.note || null,
        status: existingData.status || "received",
        checkinAt: existingData.checkinAt || now,
        doneAt: existingData.doneAt || null,
        checkoutAt: existingData.checkoutAt || null,
        passwordPattern: passwordPatternValue || null,
        imei: imei || null,
        hpCatalog: {
          id: selectedDevice.id,
          modelName: selectedDevice.modelName,
          brand: { name: selectedDevice.brandName },
        },
        technician: existingData.technician || null,
        createdBy: existingData.createdBy,
        invoice: existingData.invoice || null,
      });
      onOpenChange(false);
    }

    setIsLoading(true);
    const result = initialState.isEditMode && editData ? await updateService(editData.id, payload) : await createService(payload, tokoId);
    setIsLoading(false);

    if (result.success) {
      onSuccess();
      return;
    }

    if (!initialState.isEditMode && onRevertCreate) {
      onRevertCreate(tempId);
    }
    if (initialState.isEditMode && editData && onRevertUpdate) {
      onRevertUpdate(editData as ServiceListItemType);
    }
    setError(result.error || `Gagal ${initialState.isEditMode ? "memperbarui" : "membuat"} service`);
  }

  return (
    <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-2xl">
      <DialogHeader >
        <DialogTitle className="flex items-center gap-2 text-xl">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <RiTicketLine className="size-4" />
          </span>
          {initialState.isEditMode ? "Edit Tiket Service" : "Tiket Service Baru"}
        </DialogTitle>
        <DialogDescription>
          {initialState.isEditMode ? "Perbarui detail tiket service di bawah." : "Buat tiket service baru dengan mengisi detail di bawah."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <DeviceInput
          value={selectedDevice}
          onChange={setSelectedDevice}
          disabled={isLoading}
          error={deviceError}
          devices={devices}
          isLoadingDevices={isLoadingDevices}
          onDeviceCreated={handleDeviceCreated}
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <RiUserLine className="size-4" />
              Info Pelanggan
            </span>
          </div>

          <div className="ml-4 grid grid-cols-1 gap-4 border-l border-border pl-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerName" className="text-sm">Nama Pelanggan</Label>
              <Input id="customerName" placeholder="Nama (opsional)" disabled={isLoading} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="noWa" className="flex items-center gap-1.5 text-sm">
                  <RiWhatsappLine className="size-3.5" />
                  WhatsApp
                </Label>
                <span className="text-sm leading-none text-destructive">*</span>
              </div>
              <Input id="noWa" placeholder="08123456789 atau 6281234567890" disabled={isLoading} value={noWa} onChange={(e) => setNoWa(e.target.value)} inputMode="tel" />
              <p className="text-xs text-muted-foreground">Format didukung: 08..., 628..., atau +628....</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-2" />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <RiToolsLine className="size-4" />
              Detail Service
            </span>
          </div>

          <div className="ml-4 flex flex-col gap-4 border-l border-border pl-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="complaint" className="flex items-center gap-1.5 text-sm">
                  <RiMessage3Line className="size-3.5" />
                  Keluhan
                </Label>
                <span className="text-sm leading-none text-destructive">*</span>
              </div>
              <textarea
                id="complaint"
                placeholder="Deskripsikan masalah pada perangkat..."
                disabled={isLoading}
                rows={3}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                className="flex min-h-[80px] w-full rounded border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <RiBox3Line className="size-3.5" />
                Kelengkapan
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Tambah barang (cth., charger, case)..."
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={isLoading || !newItem.trim()} className="justify-center">
                  <RiAddLine className="mr-1 size-4" />
                  Tambah
                </Button>
              </div>
              {includedItems.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {includedItems.map((item, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1 pr-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="ml-1 hover:text-destructive focus:outline-none"
                        disabled={isLoading}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm">Kata Sandi / Pattern Lock</Label>

              <div className="flex gap-2">
                <Button type="button" variant={!showPatternLock ? "default" : "outline"} size="sm" onClick={() => { setShowPatternLock(false); setPattern([]); }} disabled={isLoading}>Teks</Button>
                <Button type="button" variant={showPatternLock ? "default" : "outline"} size="sm" onClick={() => { setShowPatternLock(true); setPasswordPatternText(""); }} disabled={isLoading}>Pattern</Button>
              </div>

              {!showPatternLock && (
                <Input id="passwordPattern" placeholder="Kode buka perangkat (PIN, password)" disabled={isLoading} value={passwordPatternText} onChange={(e) => setPasswordPatternText(e.target.value)} />
              )}

              {showPatternLock && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-3">
                    <PatternLock
                      key={patternResetKey}
                      pattern={pattern.length > 0 ? pattern : undefined}
                      animatePattern={initialState.isEditMode && pattern.length > 0}
                      animationKey={patternResetKey}
                      width={240}
                      height={240}
                      error={patternError}
                      autoReset={false}
                      onPatternComplete={handlePatternComplete}
                      onPatternChange={(p) => {
                        if (p.length > 0) setPatternError(false);
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      {pattern.length > 0 ? (
                        <Badge variant="secondary" className="max-w-full truncate font-mono">{pattern.join(" -> ")}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Gambar pola di atas</span>
                      )}
                    </div>
                    {pattern.length > 0 && (
                      <Button type="button" variant="ghost" size="sm" onClick={clearPattern} disabled={isLoading} className="justify-center sm:w-auto">
                        <RiDeleteBinLine className="mr-1 size-4" />
                        Hapus
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="imei" className="text-sm">IMEI</Label>
              <Input id="imei" placeholder="Nomor IMEI perangkat" disabled={isLoading} value={imei} onChange={(e) => setImei(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="dpAmount" className="text-sm">DP / Uang Muka (opsional)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 mb-1 left-3 flex items-center text-sm text-muted-foreground">
                  Rp,
                </span>
                <Input
                  id="dpAmount"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  disabled={isLoading}
                  value={formattedDpAmount}
                  onChange={(e) => setDpAmount(e.target.value.replace(/\D/g, ""))}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="w-full sm:w-auto">
            <RiCloseLine className="mr-1 size-4" />
            Batal
          </Button>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <svg className="mr-2 size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {initialState.isEditMode ? "Memperbarui..." : "Membuat..."}
              </>
            ) : initialState.isEditMode ? (
              "Perbarui Tiket"
            ) : (
              "Buat Tiket"
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function ServicesForm(props: ServicesFormProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ServicesFormContent key={props.editData?.id ?? "new-service"} {...props} /> : null}
    </Dialog>
  );
}
