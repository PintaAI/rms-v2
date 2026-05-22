"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createInventoryUnit,
  updateInventoryUnit,
  type InventoryUnitItem,
  type InventoryUnitCondition,
} from "@/actions/inventory-unit";
import { DeviceInput, type DeviceModelOption } from "@/components/shared/device-input";
import { loadDeviceCatalog, refreshDeviceCatalogIfStale } from "@/lib/device-catalog-cache";
import { formatCurrencyInput, getCurrencyInputDigits, formatCurrency } from "@/lib/utils";
import {
  RiAddLine,
  RiCheckLine,
  RiLoader4Line,
  RiSmartphoneLine,
} from "@remixicon/react";

interface PhoneUnitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: InventoryUnitItem | null;
  tokoId: string;
  onSuccess: (newUnit?: InventoryUnitItem) => void;
}

const CONDITION_OPTIONS: { value: InventoryUnitCondition; label: string; description: string }[] = [
  { value: "new", label: "Baru", description: "Kondisi baru, belum digunakan" },
  { value: "used_good", label: "Bekas (Baik)", description: "Kondisi baik, fungsi normal" },
  { value: "used_fair", label: "Bekas (Cukup)", description: "Kondisi cukup, ada cacat kecil" },
  { value: "refurbished", label: "Refurbished", description: "Perbaikan resmi, fungsi normal" },
  { value: "damaged", label: "Rusak", description: "Ada kerusakan, tidak layak jual" },
];

export function PhoneUnitFormDialog({
  open,
  onOpenChange,
  unit,
  tokoId,
  onSuccess,
}: PhoneUnitFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceModelOption[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  const [selectedDevice, setSelectedDevice] = useState<DeviceModelOption | null>(null);
  const [imei, setImei] = useState(unit?.imei ?? "");
  const [serialNumber, setSerialNumber] = useState(unit?.serialNumber ?? "");
  const [condition, setCondition] = useState<InventoryUnitCondition>(unit?.condition ?? "used_good");
  const [purchasePrice, setPurchasePrice] = useState(unit ? unit.purchasePrice.toString() : "");
  const [sellingPrice, setSellingPrice] = useState(unit ? unit.sellingPrice.toString() : "");
  const [warrantyDays, setWarrantyDays] = useState(unit?.warrantyDays != null ? unit.warrantyDays.toString() : "");
  const [notes, setNotes] = useState(unit?.notes ?? "");

  const isEditing = unit != null;

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

  const handleDeviceCreated = useCallback((device: DeviceModelOption) => {
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

  useEffect(() => {
    if (unit) {
      setSelectedDevice({
        id: unit.deviceModelId,
        modelName: unit.deviceModelName,
        brandName: unit.deviceBrandName,
      });
      setImei(unit.imei ?? "");
      setSerialNumber(unit.serialNumber ?? "");
      setCondition(unit.condition);
      setPurchasePrice(unit.purchasePrice.toString());
      setSellingPrice(unit.sellingPrice.toString());
      setWarrantyDays(unit.warrantyDays != null ? unit.warrantyDays.toString() : "");
      setNotes(unit.notes ?? "");
    } else {
      setSelectedDevice(null);
      setImei("");
      setSerialNumber("");
      setCondition("used_good");
      setPurchasePrice("");
      setSellingPrice("");
      setWarrantyDays("");
      setNotes("");
    }
    setError(null);
  }, [unit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!selectedDevice) {
        setError("Pilih model perangkat");
        setIsLoading(false);
        return;
      }

      if (!purchasePrice || !sellingPrice) {
        setError("Harga beli dan harga jual wajib diisi");
        setIsLoading(false);
        return;
      }

      if (isEditing) {
        const result = await updateInventoryUnit(tokoId, {
          id: unit.id,
          imei: imei || null,
          serialNumber: serialNumber || null,
          condition,
          purchasePrice: parseInt(purchasePrice, 10),
          sellingPrice: parseInt(sellingPrice, 10),
          warrantyDays: warrantyDays ? parseInt(warrantyDays, 10) : null,
          notes: notes || null,
        });

        if (result.success && result.data) {
          onSuccess(result.data);
          onOpenChange(false);
        } else {
          setError(result.error ?? "Gagal mengupdate unit");
        }
      } else {
        const result = await createInventoryUnit(tokoId, {
          deviceModelId: selectedDevice.id,
          imei: imei || null,
          serialNumber: serialNumber || null,
          condition,
          purchasePrice: parseInt(purchasePrice, 10),
          sellingPrice: parseInt(sellingPrice, 10),
          warrantyDays: warrantyDays ? parseInt(warrantyDays, 10) : null,
          notes: notes || null,
        });

        if (result.success && result.data) {
          onSuccess(result.data);
          onOpenChange(false);
        } else {
          setError(result.error ?? "Gagal membuat unit");
        }
      }
    } catch (err) {
      setError("Terjadi kesalahan");
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:min-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiSmartphoneLine className="h-5 w-5" />
            {isEditing ? "Edit Unit Phone" : "Tambah Unit Phone"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <DeviceInput
              value={selectedDevice}
              onChange={setSelectedDevice}
              disabled={isLoading}
              error={error && !selectedDevice ? "Pilih model perangkat" : null}
              devices={devices}
              isLoadingDevices={isLoadingDevices}
              onDeviceCreated={handleDeviceCreated}
            />
          )}

          {isEditing && selectedDevice && (
            <div className="space-y-2">
              <Label>Model Perangkat</Label>
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <RiSmartphoneLine className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{selectedDevice.brandName}</div>
                  <div className="truncate text-sm text-muted-foreground">{selectedDevice.modelName}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="imei">IMEI</Label>
              <Input
                id="imei"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="123456789012345"
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="SN123456"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Kondisi</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as InventoryUnitCondition)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kondisi" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {CONDITION_OPTIONS.find((opt) => opt.value === condition)?.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Harga Beli (Rp)</Label>
              <Input
                id="purchasePrice"
                type="text"
                value={formatCurrencyInput(purchasePrice)}
                onChange={(e) => setPurchasePrice(getCurrencyInputDigits(e.target.value))}
                placeholder="0"
              />
              {purchasePrice && (
                <p className="text-xs text-muted-foreground">{formatCurrency(parseInt(purchasePrice, 10))}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Harga Jual (Rp)</Label>
              <Input
                id="sellingPrice"
                type="text"
                value={formatCurrencyInput(sellingPrice)}
                onChange={(e) => setSellingPrice(getCurrencyInputDigits(e.target.value))}
                placeholder="0"
              />
              {sellingPrice && (
                <p className="text-xs text-muted-foreground">{formatCurrency(parseInt(sellingPrice, 10))}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warrantyDays">Garansi (Hari)</Label>
            <Input
              id="warrantyDays"
              type="number"
              value={warrantyDays}
              onChange={(e) => setWarrantyDays(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan kondisi, aksesori, dll"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading || (!isEditing && !selectedDevice)}>
              {isLoading ? (
                <RiLoader4Line className="h-4 w-4 animate-spin mr-1.5" />
              ) : isEditing ? (
                <RiCheckLine className="h-4 w-4 mr-1.5" />
              ) : (
                <RiAddLine className="h-4 w-4 mr-1.5" />
              )}
              {isLoading ? "Menyimpan..." : isEditing ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
