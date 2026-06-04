"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createSuperuserBrand,
  createSuperuserHpCatalog,
  deleteSuperuserBrand,
  deleteSuperuserHpCatalog,
  updateSuperuserBrand,
  updateSuperuserHpCatalog,
  type SuperuserBrandRow,
  type SuperuserDeviceCatalogData,
  type SuperuserHpCatalogRow,
} from "@/actions/superuser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiSearchLine } from "@remixicon/react";

interface DeviceCatalogManagementProps {
  data: SuperuserDeviceCatalogData;
}

const emptyBrandForm = { name: "" };
const emptyDeviceForm = { brandId: "", modelName: "", modelNumber: "" };

export function DeviceCatalogManagement({ data }: DeviceCatalogManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [brands, setBrands] = useState(data.brands);
  const [devices, setDevices] = useState(data.devices);
  const [query, setQuery] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [brandForm, setBrandForm] = useState(emptyBrandForm);
  const [deviceForm, setDeviceForm] = useState(emptyDeviceForm);
  const [editingBrand, setEditingBrand] = useState<SuperuserBrandRow | null>(null);
  const [editingDevice, setEditingDevice] = useState<SuperuserHpCatalogRow | null>(null);
  const [brandDeleteTarget, setBrandDeleteTarget] = useState<SuperuserBrandRow | null>(null);
  const [deviceDeleteTarget, setDeviceDeleteTarget] = useState<SuperuserHpCatalogRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBrands(data.brands);
      setDevices(data.devices);
      setSelectedDeviceIds((current) => new Set([...current].filter((id) => data.devices.some((device) => device.id === id))));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [data]);

  const filteredDevices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return devices;

    return devices.filter((device) =>
      [device.brandName, device.modelName, device.modelNumber ?? "", device.mobileApiId ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [devices, query]);

  const selectedDevices = useMemo(
    () => devices.filter((device) => selectedDeviceIds.has(device.id)),
    [devices, selectedDeviceIds]
  );

  const selectedFilteredDeviceIds = filteredDevices
    .filter((device) => selectedDeviceIds.has(device.id))
    .map((device) => device.id);
  const allFilteredSelected = filteredDevices.length > 0 && selectedFilteredDeviceIds.length === filteredDevices.length;
  const selectAllChecked = allFilteredSelected ? true : selectedFilteredDeviceIds.length > 0 ? "indeterminate" : false;

  const openCreateBrand = () => {
    setEditingBrand(null);
    setBrandForm(emptyBrandForm);
    setBrandOpen(true);
  };

  const openEditBrand = (brand: SuperuserBrandRow) => {
    setEditingBrand(brand);
    setBrandForm({ name: brand.name });
    setBrandOpen(true);
  };

  const openCreateDevice = () => {
    setEditingDevice(null);
    setDeviceForm({ ...emptyDeviceForm, brandId: brands[0]?.id ?? "" });
    setDeviceOpen(true);
  };

  const openEditDevice = (device: SuperuserHpCatalogRow) => {
    setEditingDevice(device);
    setDeviceForm({
      brandId: device.brandId,
      modelName: device.modelName,
      modelNumber: device.modelNumber ?? "",
    });
    setDeviceOpen(true);
  };

  const refreshCatalog = () => {
    router.refresh();
  };

  const submitBrand = () => {
    startTransition(async () => {
      const result = editingBrand
        ? await updateSuperuserBrand({ id: editingBrand.id, ...brandForm })
        : await createSuperuserBrand(brandForm);

      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to save brand");
        return;
      }

      toast.success(editingBrand ? "Brand updated" : "Brand created");
      setBrandOpen(false);
      refreshCatalog();
    });
  };

  const submitDevice = () => {
    startTransition(async () => {
      const result = editingDevice
        ? await updateSuperuserHpCatalog({ id: editingDevice.id, ...deviceForm })
        : await createSuperuserHpCatalog(deviceForm);

      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to save HP model");
        return;
      }

      toast.success(editingDevice ? "HP model updated" : "HP model created");
      setDeviceOpen(false);
      refreshCatalog();
    });
  };

  const removeBrand = (brand: SuperuserBrandRow) => {
    setBrandDeleteTarget(brand);
  };

  const confirmRemoveBrand = () => {
    const target = brandDeleteTarget;
    if (!target) return;
    startTransition(async () => {
      const result = await deleteSuperuserBrand(target.id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete brand");
        return;
      }

      toast.success("Brand deleted");
      setBrandDeleteTarget(null);
      refreshCatalog();
    });
  };

  const removeDevice = (device: SuperuserHpCatalogRow) => {
    setDeviceDeleteTarget(device);
  };

  const confirmRemoveDevice = () => {
    const target = deviceDeleteTarget;
    if (!target) return;
    startTransition(async () => {
      const result = await deleteSuperuserHpCatalog(target.id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete HP model");
        return;
      }

      toast.success("HP model deleted");
      setSelectedDeviceIds((current) => {
        const next = new Set(current);
        next.delete(target.id);
        return next;
      });
      setDeviceDeleteTarget(null);
      refreshCatalog();
    });
  };

  const toggleDeviceSelection = (deviceId: string, checked: boolean) => {
    setSelectedDeviceIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(deviceId);
      } else {
        next.delete(deviceId);
      }
      return next;
    });
  };

  const toggleFilteredSelection = (checked: boolean) => {
    setSelectedDeviceIds((current) => {
      const next = new Set(current);
      for (const device of filteredDevices) {
        if (checked) {
          next.add(device.id);
        } else {
          next.delete(device.id);
        }
      }
      return next;
    });
  };

  const confirmBulkRemoveDevices = () => {
    const targets = selectedDevices;
    if (targets.length === 0) return;

    startTransition(async () => {
      const deletedIds = new Set<string>();
      const failedMessages: string[] = [];

      for (const device of targets) {
        const result = await deleteSuperuserHpCatalog(device.id);
        if (result.success) {
          deletedIds.add(device.id);
        } else {
          failedMessages.push(`${device.brandName} ${device.modelName}: ${result.error || "Failed to delete"}`);
        }
      }

      if (deletedIds.size > 0) {
        setSelectedDeviceIds((current) => new Set([...current].filter((id) => !deletedIds.has(id))));
      }

      if (failedMessages.length > 0) {
        toast.error(`Deleted ${deletedIds.size} model(s), ${failedMessages.length} failed`, {
          description: failedMessages[0],
        });
      } else {
        toast.success(`${deletedIds.size} HP model(s) deleted`);
        setBulkDeleteOpen(false);
      }

      refreshCatalog();
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Brands</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black">{brands.length}</CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">HP Models</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black">{devices.length}</CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Imported Models</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black">
            {devices.filter((device) => device.mobileApiId).length}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)]">
        <Card className="overflow-hidden border-border/50 shadow-lg shadow-black/5">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg">Brand Management</CardTitle>
              <p className="text-sm text-muted-foreground">Global phone brands available to every toko.</p>
            </div>
            <Button size="sm" onClick={openCreateBrand} disabled={isPending}>
              <RiAddLine data-icon="inline-start" />
              Brand
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Models</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell><Badge variant="secondary">{brand.deviceCount}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => openEditBrand(brand)} disabled={isPending}>
                          <RiEditLine />
                          <span className="sr-only">Edit brand</span>
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => removeBrand(brand)} disabled={isPending || brand.deviceCount > 0}>
                          <RiDeleteBinLine />
                          <span className="sr-only">Delete brand</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/50 shadow-lg shadow-black/5">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg">HP Katalog</CardTitle>
              <p className="text-sm text-muted-foreground">Manage global phone models used in service check-ins.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <RiSearchLine className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search models" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)} disabled={isPending || selectedDevices.length === 0}>
                <RiDeleteBinLine data-icon="inline-start" />
                Delete selected{selectedDevices.length > 0 ? ` (${selectedDevices.length})` : ""}
              </Button>
              <Button size="sm" onClick={openCreateDevice} disabled={isPending || brands.length === 0}>
                <RiAddLine data-icon="inline-start" />
                HP Model
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectAllChecked}
                      onCheckedChange={(checked) => toggleFilteredSelection(checked === true)}
                      disabled={isPending || filteredDevices.length === 0}
                      aria-label="Select all HP models"
                    />
                  </TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Model Number</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDeviceIds.has(device.id)}
                        onCheckedChange={(checked) => toggleDeviceSelection(device.id, checked === true)}
                        disabled={isPending}
                        aria-label={`Select ${device.brandName} ${device.modelName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{device.brandName}</TableCell>
                    <TableCell>{device.modelName}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{device.modelNumber || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      {device.mobileApiId ? <Badge variant="accent">Mobile API</Badge> : <Badge variant="outline">Manual</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => openEditDevice(device)} disabled={isPending}>
                          <RiEditLine />
                          <span className="sr-only">Edit HP model</span>
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => removeDevice(device)} disabled={isPending}>
                          <RiDeleteBinLine />
                          <span className="sr-only">Delete HP model</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredDevices.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No HP models found.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={brandOpen} onOpenChange={setBrandOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit brand" : "Create brand"}</DialogTitle>
            <DialogDescription>Brand names must be unique across the global catalog.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="brand-name">Brand name</FieldLabel>
              <FieldContent>
                <Input id="brand-name" value={brandForm.name} onChange={(event) => setBrandForm({ name: event.target.value })} />
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={submitBrand} disabled={isPending}>{isPending ? "Saving..." : "Save brand"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deviceOpen} onOpenChange={setDeviceOpen}>
        <DialogContent className="max-w-2xl sm:min-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDevice ? "Edit HP model" : "Create HP model"}</DialogTitle>
            <DialogDescription>Each brand can only have one entry with the same model name.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Brand</FieldLabel>
              <FieldContent>
                <Select value={deviceForm.brandId} onValueChange={(brandId) => setDeviceForm({ ...deviceForm, brandId })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose brand" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {brands.map((brand) => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="hp-model-name">Model name</FieldLabel>
              <FieldContent>
                <Input id="hp-model-name" value={deviceForm.modelName} onChange={(event) => setDeviceForm({ ...deviceForm, modelName: event.target.value })} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="hp-model-number">Model number</FieldLabel>
              <FieldContent>
                <Input id="hp-model-number" value={deviceForm.modelNumber} onChange={(event) => setDeviceForm({ ...deviceForm, modelNumber: event.target.value })} placeholder="Optional" />
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={submitDevice} disabled={isPending}>{isPending ? "Saving..." : "Save HP model"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(brandDeleteTarget)} onOpenChange={(open) => !open && setBrandDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand?</AlertDialogTitle>
            <AlertDialogDescription>
              {brandDeleteTarget ? `This will permanently delete ${brandDeleteTarget.name}.` : "This brand will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRemoveBrand} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete brand"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deviceDeleteTarget)} onOpenChange={(open) => !open && setDeviceDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete HP model?</AlertDialogTitle>
            <AlertDialogDescription>
              {deviceDeleteTarget
                ? `This will permanently delete ${deviceDeleteTarget.brandName} ${deviceDeleteTarget.modelName}.`
                : "This HP model will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRemoveDevice} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete model"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected HP models?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedDevices.length} selected HP model(s). Models used by services or sparepart compatibility will be skipped by the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmBulkRemoveDevices} disabled={isPending || selectedDevices.length === 0}>
              {isPending ? "Deleting..." : "Delete selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
