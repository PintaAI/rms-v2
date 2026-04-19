"use client";

/**
 * ServicesForm - Form dialog for creating/updating service tickets
 *
 * OPTIMISTIC UI ARCHITECTURE (follows dev-docs/optimistic-ui-guide.md):
 *
 * This form supports optimistic UI updates via callbacks:
 *
 * CREATE:
 * - onOptimisticCreate(tempService): Called BEFORE server request
 * - onSuccess(): Called AFTER server success, decrement mutation guard
 * - onRevertCreate(tempId): Called on failure to remove temp item
 *
 * UPDATE:
 * - onOptimisticUpdate(updatedService): Called BEFORE server request
 * - onSuccess(): Called AFTER server success, decrement mutation guard
 * - onRevertUpdate(originalService): Called on failure to restore original
 *
 * CRITICAL: onSuccess must be called AFTER server success to decrement
 * the pendingMutationsRef counter in the parent component.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createService, updateService } from "@/actions";
import type { ServiceListItem as ServiceListItemType } from "@/actions";
import type { ServiceTableItem } from "@/components/dashboard/service-table/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PatternLock } from "@/components/pattern-lock";
import { DeviceInput, HpCatalogOption } from "./device-input";


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

export function ServicesForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
  tokoId,
  onOptimisticCreate,
  onOptimisticUpdate,
  onRevertCreate,
  onRevertUpdate,
}: ServicesFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<HpCatalogOption | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [noWa, setNoWa] = useState("");
  const [complaint, setComplaint] = useState("");
  const [imei, setImei] = useState("");
  const [passwordPatternText, setPasswordPatternText] = useState("");

  const [pattern, setPattern] = useState<number[]>([]);
  const [showPatternLock, setShowPatternLock] = useState(false);
  const [patternError, setPatternError] = useState(false);
  const [patternResetKey, setPatternResetKey] = useState(0);

  const editDataRef = useRef(editData);

  useEffect(() => {
    editDataRef.current = editData;
  }, [editData]);

  const resetForm = useCallback(() => {
    setIsEditMode(false);
    setSelectedDevice(null);
    setCustomerName("");
    setNoWa("");
    setComplaint("");
    setImei("");
    setPasswordPatternText("");
    setPattern([]);
    setShowPatternLock(false);
    setPatternError(false);
    setError(null);
    setDeviceError(null);
    setIsLoading(false);
    setPatternResetKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    if (editData) {
      setIsEditMode(true);
      setSelectedDevice({
        id: editData.hpCatalogId || "",
        modelName: editData.hpCatalog.modelName,
        brandName: editData.hpCatalog.brand.name,
      });
      setCustomerName(editData.customerName || "");
      setNoWa(editData.noWa || "");
      setComplaint(editData.complaint || "");
      setImei(editData.imei || "");

      const passwordPattern = editData.passwordPattern || "";
      if (passwordPattern && /^[\d-]+$/.test(passwordPattern)) {
        const patternArray = passwordPattern.split("-").map(Number);
        setPattern(patternArray);
        setShowPatternLock(true);
        setPasswordPatternText("");
      } else {
        setPasswordPatternText(passwordPattern);
        setShowPatternLock(false);
        setPattern([]);
      }
    } else {
      resetForm();
    }
  }, [editData, open, resetForm]);

  const handlePatternComplete = useCallback((newPattern: number[]) => {
    setPattern(newPattern);
    setPatternError(false);
  }, []);

  const clearPattern = useCallback(() => {
    setPattern([]);
    setPatternError(false);
    setPatternResetKey((prev) => prev + 1);
  }, []);

  const patternToString = useCallback((p: number[]) => {
    return p.length > 0 ? p.join("-") : "";
  }, []);

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

    const passwordPatternValue = showPatternLock && pattern.length > 0
      ? patternToString(pattern)
      : passwordPatternText;

    const payload = {
      hpCatalogId: selectedDevice.id,
      customerName: customerName || undefined,
      noWa: noWa,
      complaint: complaint,
      passwordPattern: passwordPatternValue || undefined,
      imei: imei || undefined,
    };

    const tempId = `temp-${Date.now()}`;
    const now = new Date();

    if (!isEditMode && onOptimisticCreate) {
      onOptimisticCreate({
        id: tempId,
        hpCatalogId: selectedDevice.id,
        customerName: customerName || null,
        noWa: noWa,
        complaint: complaint,
        note: null,
        status: "received" as const,
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

    if (isEditMode && editData && onOptimisticUpdate) {
      const existingData = editData as ServiceListItemType;
      onOptimisticUpdate({
        id: editData.id,
        hpCatalogId: selectedDevice.id,
        customerName: customerName || null,
        noWa: noWa,
        complaint: complaint,
        note: existingData.note || null,
        status: existingData.status || "received" as const,
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
    const result = isEditMode && editData
      ? await updateService(editData.id, payload)
      : await createService(payload, tokoId);
    setIsLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      if (!isEditMode && onRevertCreate) {
        onRevertCreate(tempId);
      }
      if (isEditMode && editDataRef.current && onRevertUpdate) {
        const originalData = editDataRef.current as ServiceListItemType;
        onRevertUpdate(originalData);
      }
      setError(result.error || "Failed to " + (isEditMode ? "update" : "create") + " service");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditMode ? "Edit Service Ticket" : "New Service Ticket"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update the service ticket details below." 
              : "Create a new service ticket by filling in the details below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <DeviceInput
            value={selectedDevice}
            onChange={setSelectedDevice}
            disabled={isLoading}
            error={deviceError}
          />

          {/* Customer Information Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">Customer Info</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-sm">
                  Customer Name
                </Label>
                <Input
                  id="customerName"
                  placeholder="Name (optional)"
                  disabled={isLoading}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="noWa" className="text-sm">
                    WhatsApp
                  </Label>
                  <Badge variant="secondary" className="text-[10px] px-1">
                    Required
                  </Badge>
                </div>
                <Input
                  id="noWa"
                  placeholder="08123456789"
                  disabled={isLoading}
                  value={noWa}
                  onChange={(e) => setNoWa(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Service Details Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">Service Details</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="complaint" className="text-sm">
                    Complaint
                  </Label>
                  <Badge variant="secondary" className="text-[10px] px-1">
                    Required
                  </Badge>
                </div>
                <textarea
                  id="complaint"
                  placeholder="Describe the issue with the device..."
                  disabled={isLoading}
                  rows={3}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  className="flex min-h-[80px] rounded-3xl w-full border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Password / Pattern Lock - Full width */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Password / Pattern Lock
                </Label>
                
                {/* Pattern lock toggle buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!showPatternLock ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowPatternLock(false);
                      setPattern([]);
                    }}
                    disabled={isLoading}
                  >
                    Text
                  </Button>
                  <Button
                    type="button"
                    variant={showPatternLock ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowPatternLock(true);
                      setPasswordPatternText("");
                    }}
                    disabled={isLoading}
                  >
                    Pattern
                  </Button>
                </div>

                {/* Text input for password */}
                {!showPatternLock && (
                  <Input
                    id="passwordPattern"
                    placeholder="Device unlock code (PIN, password)"
                    disabled={isLoading}
                    value={passwordPatternText}
                    onChange={(e) => setPasswordPatternText(e.target.value)}
                  />
                )}

                {/* Pattern lock component */}
                {showPatternLock && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center p-3 bg-muted/30 rounded-lg border">
                      <PatternLock
                        key={patternResetKey}
                        pattern={pattern.length > 0 ? pattern : undefined}
                        animatePattern={isEditMode && pattern.length > 0}
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
                    
                    {/* Pattern display and controls */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {pattern.length > 0 && (
                          <Badge variant="secondary" className="font-mono">
                            {pattern.join(" → ")}
                          </Badge>
                        )}
                        {pattern.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            Draw a pattern above
                          </span>
                        )}
                      </div>
                      {pattern.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearPattern}
                          disabled={isLoading}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* IMEI - Separate row */}
              <div className="space-y-2">
                <Label htmlFor="imei" className="text-sm">
                  IMEI
                </Label>
                <Input
                  id="imei"
                  placeholder="Device IMEI number"
                  disabled={isLoading}
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              onClick={(e) => {
                if (isLoading) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Update Ticket" : "Create Ticket"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
