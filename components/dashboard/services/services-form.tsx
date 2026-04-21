"use client";

import { useCallback, useState } from "react";
import { createService, updateService } from "@/actions";
import type { ServiceListItem as ServiceListItemType } from "@/actions";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table/types";
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

interface ServiceFormData {
  id: string;
  hpCatalogId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
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
  imei: string;
  passwordPatternText: string;
  pattern: number[];
  showPatternLock: boolean;
};

function getInitialFormState(editData?: ServiceFormData | ServiceListItemType | ServiceTableItem | null): FormSnapshot {
  if (!editData) {
    return {
      isEditMode: false,
      selectedDevice: null,
      customerName: "",
      noWa: "",
      complaint: "",
      imei: "",
      passwordPatternText: "",
      pattern: [],
      showPatternLock: false,
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
    imei: editData.imei || "",
    passwordPatternText: isPattern ? "" : passwordPattern,
    pattern: isPattern ? passwordPattern.split("-").map(Number) : [],
    showPatternLock: isPattern,
  };
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
  const [imei, setImei] = useState(initialState.imei);
  const [passwordPatternText, setPasswordPatternText] = useState(initialState.passwordPatternText);
  const [pattern, setPattern] = useState<number[]>(initialState.pattern);
  const [showPatternLock, setShowPatternLock] = useState(initialState.showPatternLock);
  const [patternError, setPatternError] = useState(false);
  const [patternResetKey, setPatternResetKey] = useState(0);

  const clearPattern = useCallback(() => {
    setPattern([]);
    setPatternError(false);
    setPatternResetKey((prev) => prev + 1);
  }, []);

  const handlePatternComplete = useCallback((newPattern: number[]) => {
    setPattern(newPattern);
    setPatternError(false);
  }, []);

  const patternToString = useCallback((p: number[]) => (p.length > 0 ? p.join("-") : ""), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDeviceError(null);

    if (!selectedDevice) {
      setDeviceError("Please select or enter a device");
      return;
    }

    if (!noWa.trim()) {
      setError("WhatsApp number is required");
      return;
    }

    if (!complaint.trim()) {
      setError("Complaint is required");
      return;
    }

    const passwordPatternValue = showPatternLock && pattern.length > 0 ? patternToString(pattern) : passwordPatternText;
    const payload = {
      hpCatalogId: selectedDevice.id,
      customerName: customerName || undefined,
      noWa,
      complaint,
      passwordPattern: passwordPatternValue || undefined,
      imei: imei || undefined,
    };

    const tempId = `temp-${Date.now()}`;
    const now = new Date();

    if (!initialState.isEditMode && onOptimisticCreate) {
      onOptimisticCreate({
        id: tempId,
        hpCatalogId: selectedDevice.id,
        customerName: customerName || null,
        noWa,
        complaint,
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
        noWa,
        complaint,
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
    setError(result.error || `Failed to ${initialState.isEditMode ? "update" : "create"} service`);
  }

  return (
    <DialogContent className="min-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl">{initialState.isEditMode ? "Edit Service Ticket" : "New Service Ticket"}</DialogTitle>
        <DialogDescription>
          {initialState.isEditMode ? "Update the service ticket details below." : "Create a new service ticket by filling in the details below."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <DeviceInput value={selectedDevice} onChange={setSelectedDevice} disabled={isLoading} error={deviceError} />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">Customer Info</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-sm">Customer Name</Label>
              <Input id="customerName" placeholder="Name (optional)" disabled={isLoading} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="noWa" className="text-sm">WhatsApp</Label>
                <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
              </div>
              <Input id="noWa" placeholder="08123456789" disabled={isLoading} value={noWa} onChange={(e) => setNoWa(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">Service Details</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="complaint" className="text-sm">Complaint</Label>
                <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
              </div>
              <textarea
                id="complaint"
                placeholder="Describe the issue with the device..."
                disabled={isLoading}
                rows={3}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                className="flex min-h-[80px] w-full resize-none rounded-3xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Password / Pattern Lock</Label>

              <div className="flex gap-2">
                <Button type="button" variant={!showPatternLock ? "default" : "outline"} size="sm" onClick={() => { setShowPatternLock(false); setPattern([]); }} disabled={isLoading}>Text</Button>
                <Button type="button" variant={showPatternLock ? "default" : "outline"} size="sm" onClick={() => { setShowPatternLock(true); setPasswordPatternText(""); }} disabled={isLoading}>Pattern</Button>
              </div>

              {!showPatternLock && (
                <Input id="passwordPattern" placeholder="Device unlock code (PIN, password)" disabled={isLoading} value={passwordPatternText} onChange={(e) => setPasswordPatternText(e.target.value)} />
              )}

              {showPatternLock && (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-center">
                    <PatternLock
                      key={patternResetKey}
                      pattern={pattern.length > 0 ? pattern : undefined}
                      animatePattern={initialState.isEditMode && pattern.length > 0}
                      animationKey={patternResetKey}
                      width={300}
                      height={300}
                      error={patternError}
                      autoReset={false}
                      onPatternComplete={handlePatternComplete}
                      onPatternChange={(p) => {
                        if (p.length > 0) setPatternError(false);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {pattern.length > 0 ? (
                        <Badge variant="secondary" className="font-mono">{pattern.join(" → ")}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Draw a pattern above</span>
                      )}
                    </div>
                    {pattern.length > 0 && (
                      <Button type="button" variant="ghost" size="sm" onClick={clearPattern} disabled={isLoading}>Clear</Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imei" className="text-sm">IMEI</Label>
              <Input id="imei" placeholder="Device IMEI number" disabled={isLoading} value={imei} onChange={(e) => setImei(e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {initialState.isEditMode ? "Updating..." : "Creating..."}
              </>
            ) : initialState.isEditMode ? (
              "Update Ticket"
            ) : (
              "Create Ticket"
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
