"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiLockLine,
  RiRefreshLine,
  RiArrowGoBackLine,
  RiCheckDoubleLine,
  RiCloseCircleLine,
  RiWhatsappLine,
  RiMoneyDollarCircleLine,
  RiLogoutBoxLine,
  RiFileListLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { PatternLock } from "@/components/shared/pattern-lock";
import { getBrandIcon } from "@/lib/brand-icons";
import {
  updateStatus,
  removeItem,
  getCompatibleSpareparts,
  getServicePricelists,
  payInvoice,
  pickupService,
} from "@/actions";
import { AddRepairItemForm } from "@/components/dashboard/services/add-repair-item-form";
import { PaymentDialog } from "./payment-dialog";
import { InvoiceDialog } from "@/components/dashboard/services/service-table/invoice-dialog";
import type { InvoicePreviewService } from "@/components/dashboard/services/service-table/invoice-dialog";
import { useDashboardScope } from "@/components/dashboard/layout/dashboard-scope-context";
import { ActionTile } from "@/components/shared/action-tile";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { type Role, roleToneClasses } from "@/lib/role-tone";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  received: "secondary",
  repairing: "default",
  done: "outline",
  failed: "destructive",
};

const statusLabels: Record<string, string> = {
  received: "Received",
  repairing: "In Progress",
  done: "Done",
  failed: "Failed",
};

const warrantyPresets = [
  { label: "1 Minggu", days: 7 },
  { label: "1 Bulan", months: 1 },
  { label: "2 Bulan", months: 2 },
  { label: "3 Bulan", months: 3 },
] as const;

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetWarrantyDate(preset: (typeof warrantyPresets)[number]): string {
  const date = new Date();
  if ("days" in preset) date.setDate(date.getDate() + preset.days);
  if ("months" in preset) date.setMonth(date.getMonth() + preset.months);
  return toDateInputValue(date);
}

function parseDateInputValue(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWarrantyDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function parsePatternString(patternStr: string | null): number[] {
  if (!patternStr) return [];
  return patternStr
    .split("-")
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n));
}

export interface ServiceDetailCardItem {
  id: string;
  tokoId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  handlingNote?: string | null;
  includedItems?: string[] | null;
  passwordPattern: string | null;
  imei: string | null;
  status: string;
  isPickedUp?: boolean;
  checkinAt: Date;
  doneAt: Date | null;
  warrantyUntil: Date | string | null;
  checkoutAt?: Date | null;
  hpCatalog: {
    id: string;
    modelName: string;
    brand: {
      name: string;
    };
  };
  technician: { id: string; name: string } | null;
  items: Array<{
    id: string;
    type: string;
    name: string;
    qty: number;
    price: number;
    isPending?: boolean;
  }>;
    invoice: {
      id: string;
      grandTotal: number;
      paymentStatus: string;
      dpAmount?: number;
      discountAmount?: number;
    } | null;
}

export interface ServiceDetailCardProps {
  service: ServiceDetailCardItem;
  variant?: "active" | "completed";
  viewerRole?: Role;
  showActions?: boolean;
  onAddItem?: (service: ServiceDetailCardItem) => void;
  onRemoveItem?: (itemId: string) => void;
  onRefresh?: () => void;
  onStatusChange?: (newStatus: string) => void;
  onPickupSuccess?: () => void;
}

export function ServiceDetailCard({
  service,
  variant = "active",
  viewerRole = "technician",
  showActions = true,
  onAddItem,
  onRemoveItem,
  onRefresh,
  onStatusChange,
  onPickupSuccess,
}: ServiceDetailCardProps) {
  const isActive = variant === "active";
  const { inventoryEnabled, user: currentUser } = useDashboardScope();
  const canHandleCustomerHandoff = viewerRole === "admin" || viewerRole === "staff";
  const roleTone = roleToneClasses[viewerRole];

  const [localService, setLocalService] = useState<ServiceDetailCardItem>(service);

  const localServiceRef = useRef(localService);
  const servicePropRef = useRef(service);

  useEffect(() => {
    localServiceRef.current = localService;
  }, [localService]);

  useEffect(() => {
    servicePropRef.current = service;
  }, [service]);

  const pendingMutationsRef = useRef(0);
  const mutate = useOptimisticMutation(localServiceRef, setLocalService, pendingMutationsRef);

  const serviceFingerprint = useMemo(
    () => JSON.stringify({
      id: service.id,
      status: service.status,
      isPickedUp: service.isPickedUp,
      checkoutAt: service.checkoutAt,
      items: service.items,
      doneAt: service.doneAt,
      warrantyUntil: service.warrantyUntil,
    }),
    [service.id, service.status, service.isPickedUp, service.checkoutAt, service.items, service.doneAt, service.warrantyUntil]
  );

  useEffect(() => {
    if (pendingMutationsRef.current === 0) {
      setLocalService(service);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceFingerprint]);

  const [patternDialogOpen, setPatternDialogOpen] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [undoStatus, setUndoStatus] = useState<string>("repairing");
  const [isUndoingStatus, setIsUndoingStatus] = useState(false);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [spareparts, setSpareparts] = useState<
    Array<{ id: string; name: string; barcode: string; defaultPrice: number; stock: number }>
  >([]);
  const [servicePricelists, setServicePricelists] = useState<
    Array<{ id: string; title: string; defaultPrice: number }>
  >([]);
  const [removingItemIds, setRemovingItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isActive || !inventoryEnabled) return;
    async function fetchData() {
      try {
        const [sparepartsResult, pricelistsResult] = await Promise.all([
          getCompatibleSpareparts(localService.tokoId, localService.hpCatalog.id),
          getServicePricelists(localService.tokoId),
        ]);
        if (sparepartsResult.success && sparepartsResult.data) {
          setSpareparts(sparepartsResult.data);
        }
        if (pricelistsResult.success && pricelistsResult.data) {
          setServicePricelists(pricelistsResult.data);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }
    fetchData();
  }, [isActive, inventoryEnabled, localService.tokoId, localService.hpCatalog.id]);

  function openAddItemDialog() {
    setItemDialogOpen(true);
  }

  function openPatternDialog() {
    setPatternDialogOpen(true);
  }

  function openUndoDialog() {
    setUndoStatus("repairing");
    setUndoDialogOpen(true);
  }

  const handleUndoStatus = useCallback(async () => {
    if (!undoStatus) return;
    setIsUndoingStatus(true);
    await mutate({
      optimistic: (prev) => ({ ...prev, status: undoStatus, doneAt: null, warrantyUntil: null }),
      action: () => updateStatus(localServiceRef.current.id, undoStatus as "received" | "repairing"),
      onSuccess: () => { setUndoDialogOpen(false); onRefresh?.(); },
    });
    setIsUndoingStatus(false);
  }, [undoStatus, onRefresh, mutate]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if (itemId.startsWith("temp-")) {
      toast.error("Item masih disimpan. Tunggu sebentar lalu coba lagi.");
      return;
    }

    setRemovingItemIds((prev) => new Set(prev).add(itemId));
    try {
      const result = await removeItem(itemId);
      if (!result.success) {
        toast.error(result.error || "Gagal menghapus item");
        return;
      }

      setLocalService((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      }));
      onRefresh?.();
    } catch (err) {
      console.error("Error removing item:", err);
      toast.error("Gagal menghapus item");
    } finally {
      setRemovingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [onRefresh]);

  const handleOptimisticAddItem = useCallback(
    (newItem: { id: string; type: string; name: string; qty: number; price: number; isPending?: boolean }) => {
      pendingMutationsRef.current += 1;
      setLocalService((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    },
    []
  );

  const handleAddItemSaved = useCallback(
    (tempId: string, savedItem: { id: string; type: string; name: string; qty: number; price: number }) => {
      setLocalService((prev) => ({
        ...prev,
        items: prev.items.map((item) => item.id === tempId ? savedItem : item),
      }));
    },
    []
  );

  const handleAddItemSuccess = useCallback(() => {
    pendingMutationsRef.current = 0;
  }, []);

  const handleAddItemRevert = useCallback(() => {
    pendingMutationsRef.current = 0;
    setLocalService(servicePropRef.current);
  }, []);

  const totalAmount = localService.items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const [doneDialogOpen, setDoneDialogOpen] = useState(false);
  const [doneNote, setDoneNote] = useState("");
  const [warrantyDate, setWarrantyDate] = useState("");
  const [showDoneTakeoverWarning, setShowDoneTakeoverWarning] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  const [failedDialogOpen, setFailedDialogOpen] = useState(false);
  const [failedNote, setFailedNote] = useState("");
  const [failedTakeOwnership, setFailedTakeOwnership] = useState(false);
  const [isMarkingFailed, setIsMarkingFailed] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isPayingInvoice, setIsPayingInvoice] = useState(false);
  const [isPickingUp, setIsPickingUp] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const viewInvoiceService = useMemo(() => {
    if (!localService.invoice) return null;
    return {
      id: localService.id,
      hpCatalogId: localService.hpCatalog.id,
      customerName: localService.customerName,
      noWa: localService.noWa,
      complaint: localService.complaint,
      handlingNote: localService.handlingNote,
      includedItems: localService.includedItems,
      status: localService.status,
      isPickedUp: localService.isPickedUp,
      checkinAt: localService.checkinAt,
      doneAt: localService.doneAt,
      warrantyUntil: localService.warrantyUntil,
      checkoutAt: localService.checkoutAt,
      hpCatalog: localService.hpCatalog,
      technician: localService.technician,
      invoice: localService.invoice,
      passwordPattern: localService.passwordPattern,
      imei: localService.imei,
    } satisfies InvoicePreviewService;
  }, [localService]);

  const hasCompletedStatus = localService.status === "done" || localService.status === "failed";
  const canPayInvoice = canHandleCustomerHandoff && hasCompletedStatus && !localService.isPickedUp && (localService.invoice?.paymentStatus === "unpaid" || localService.invoice?.paymentStatus === "dp");
  const canMarkPickedUp = canHandleCustomerHandoff && hasCompletedStatus && !localService.isPickedUp && (localService.status === "failed" || localService.invoice?.paymentStatus === "paid");
  const canContactDuringRepair = (localService.status === "received" || localService.status === "repairing") && Boolean(localService.noWa);
  const showCustomerHandoffActions = canHandleCustomerHandoff && hasCompletedStatus && (Boolean(localService.noWa) || canPayInvoice || canMarkPickedUp || Boolean(localService.invoice));
  const warrantyUntilDate = localService.warrantyUntil ? new Date(localService.warrantyUntil) : null;
  const warrantyExpired = warrantyUntilDate ? warrantyUntilDate < new Date() : false;
  const adminCompletingUnassignedService = viewerRole === "admin" && !localService.technician;
  const adminCompletingAssignedService = viewerRole === "admin" && Boolean(localService.technician);
  const adminCompletingAssignedToOther = viewerRole === "admin" && Boolean(localService.technician) && localService.technician?.id !== currentUser.id;

  function openDoneDialog() {
    setDoneNote("");
    setWarrantyDate(getPresetWarrantyDate(warrantyPresets[1]));
    setShowDoneTakeoverWarning(false);
    setDoneDialogOpen(true);
  }

  async function handleMarkDone() {
    if (adminCompletingAssignedToOther && !showDoneTakeoverWarning) {
      setShowDoneTakeoverWarning(true);
      return;
    }

    setIsMarkingDone(true);
    const doneNoteValue = doneNote.trim();
    const warrantyUntil = parseDateInputValue(warrantyDate);
    const currentService = localServiceRef.current;
    const takeOwnership = viewerRole === "admin" && (!currentService.technician || currentService.technician.id !== currentUser.id);
    await mutate({
      optimistic: (prev) => ({
        ...prev,
        status: "done",
        doneAt: new Date(),
        warrantyUntil,
        technician: takeOwnership ? { id: currentUser.id, name: currentUser.name } : prev.technician,
      }),
      action: () => updateStatus(localServiceRef.current.id, "done", doneNoteValue || undefined, warrantyUntil, { takeOwnership }),
      onSuccess: () => { setDoneDialogOpen(false); setShowDoneTakeoverWarning(false); onRefresh?.(); onStatusChange?.("done"); },
    });
    setIsMarkingDone(false);
  }

  function openFailedDialog() {
    setFailedNote("");
    setFailedTakeOwnership(false);
    setFailedDialogOpen(true);
  }

  async function handleMarkFailed() {
    if (!failedNote.trim()) return;
    setIsMarkingFailed(true);
    const failedNoteValue = failedNote.trim();
    const takeOwnership = adminCompletingUnassignedService && failedTakeOwnership;
    await mutate({
      optimistic: (prev) => ({
        ...prev,
        status: "failed",
        doneAt: new Date(),
        warrantyUntil: null,
        technician: takeOwnership ? { id: currentUser.id, name: currentUser.name } : prev.technician,
      }),
      action: () => updateStatus(localServiceRef.current.id, "failed", failedNoteValue || undefined, undefined, { takeOwnership }),
      onSuccess: () => { setFailedDialogOpen(false); onRefresh?.(); onStatusChange?.("failed"); },
    });
    setIsMarkingFailed(false);
  }

  function openWhatsApp() {
    const normalized = localService.noWa.replace(/\D/g, "").replace(/^0/, "62");
    if (!normalized) return;
    window.open(`https://wa.me/${normalized}`, "_blank", "noopener,noreferrer");
  }

  function openPaidInvoiceDialog() {
    setInvoiceDialogOpen(true);
  }

  async function handlePayInvoice(payment: { discountAmount: number }) {
    if (!localService.invoice || !canPayInvoice) return false;
    setIsPayingInvoice(true);
    const ok = await mutate({
      optimistic: (prev) => prev.invoice ? {
        ...prev,
        invoice: { ...prev.invoice, paymentStatus: "paid", discountAmount: payment.discountAmount },
      } : prev,
      action: () => payInvoice(localServiceRef.current.invoice!.id, payment),
      onSuccess: () => { toast.success("Invoice ditandai lunas"); onRefresh?.(); },
      onError: (error) => toast.error(error || "Gagal menandai invoice lunas"),
    });
    setIsPayingInvoice(false);
    return ok;
  }

  async function handlePickup() {
    if (!canMarkPickedUp) return;
    setIsPickingUp(true);
    const checkoutAt = new Date();
    await mutate({
      optimistic: (prev) => ({ ...prev, isPickedUp: true, checkoutAt }),
      action: () => pickupService(localServiceRef.current.id),
      onSuccess: () => { toast.success("Service ditandai sudah diambil"); onRefresh?.(); onPickupSuccess?.(); },
      onError: (error) => toast.error(error || "Gagal menandai service diambil"),
    });
    setIsPickingUp(false);
  }

  return (
    <>
      <Card className={cn("relative overflow-hidden", roleTone.card)}>
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r", roleTone.rail)} />
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0">{getBrandIcon(localService.hpCatalog.brand.name)}</span>
                <CardTitle className="text-base sm:text-lg leading-tight">
                  {localService.hpCatalog.brand.name} {localService.hpCatalog.modelName}
                </CardTitle>
                <Badge variant={statusColors[localService.status] || "outline"} className="shrink-0">
                  {statusLabels[localService.status] || localService.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {localService.technician ? (
                  <Badge variant="outline" className="border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-400 text-xs font-normal">
                    {localService.technician.name}
                  </Badge>
                ) : localService.status === "received" ? (
                  <Badge variant="secondary" className="text-muted-foreground text-xs font-normal">
                    Belum ada teknisi
                  </Badge>
                ) : null}
                {localService.isPickedUp && (
                  <Badge variant="outline" className="text-xs font-normal">Picked Up</Badge>
                )}
                {localService.invoice && (
                  <Badge
                    variant={
                      localService.invoice.paymentStatus === "paid"
                        ? "success"
                        : localService.invoice.paymentStatus === "dp"
                          ? "accent"
                          : "destructive"
                    }
                    className="text-xs font-normal"
                  >
                    {isActive ? "Invoice" : formatCurrency(localService.invoice.grandTotal)} • {localService.invoice.paymentStatus === "paid" ? "Paid" : localService.invoice.paymentStatus === "dp" ? `DP ${localService.invoice.dpAmount ? formatCurrency(localService.invoice.dpAmount) : ""}` : "Unpaid"}
                  </Badge>
                )}
              </div>
              <div>
                <CardDescription className="text-sm">
                  {localService.customerName || "No customer name"} • {localService.noWa}
                </CardDescription>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Check-in: {formatDate(localService.checkinAt)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {isActive && showActions && localService.invoice?.paymentStatus !== "paid" && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (onAddItem) {
                      onAddItem(localService);
                    } else {
                      openAddItemDialog();
                    }
                  }}
                >
                  <RiAddLine className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Tambah Sparepart & jasa</span>
                </Button>
              )}
              {!isActive && (localService.status === "done" || localService.status === "failed") && localService.invoice?.paymentStatus !== "paid" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openUndoDialog}
                >
                  <RiArrowGoBackLine className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Undo</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Keluhan</Label>
              <p className="text-sm">{localService.complaint}</p>
            </div>

            {localService.handlingNote && (
              <div>
                <Label className="text-muted-foreground">Penanganan</Label>
                <p className="text-sm">{localService.handlingNote}</p>
              </div>
            )}

            {warrantyUntilDate && (
              <div className={cn(
                "flex items-start gap-3 rounded-lg border p-3",
                warrantyExpired
                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300"
              )}>
                <RiShieldCheckLine className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <Label className="text-current">Garansi Service</Label>
                  <p className="text-sm">
                    {warrantyExpired ? "Garansi berakhir pada" : "Garansi berlaku sampai"} {formatWarrantyDate(warrantyUntilDate)}
                  </p>
                </div>
              </div>
            )}

            {localService.includedItems && localService.includedItems.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Kelengkapan</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {localService.includedItems.map((item, index) => (
                    <Badge key={index} variant="outline" className="text-xs">{item}</Badge>
                  ))}
                </div>
              </div>
            )}

            {isActive && (localService.passwordPattern || localService.imei) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {localService.passwordPattern && (
                  <div>
                    <Label className="text-muted-foreground">Password / Pattern</Label>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {localService.passwordPattern.includes("-") ? (
                        <>
                          <Badge variant="outline" className="max-w-full whitespace-normal break-words font-mono">
                            Pattern: {parsePatternString(localService.passwordPattern).join(" → ")}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={openPatternDialog}
                          >
                            <RiLockLine className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline" className="max-w-full whitespace-normal break-words font-mono">
                          {localService.passwordPattern}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {localService.imei && (
                  <div>
                    <Label className="text-muted-foreground">IMEI</Label>
                    <p className="text-sm font-mono">{localService.imei}</p>
                  </div>
                )}
              </div>
            )}

            {localService.items.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Repair Items</Label>
                <div className="mt-1 overflow-x-auto rounded-md border">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        {isActive && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {localService.items.map((item) => (
                        <TableRow key={item.id} className={item.isPending ? "opacity-70" : undefined}>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline">{item.type}</Badge>
                              {item.isPending && (
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  Menyimpan...
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>{formatCurrency(item.price)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.price * item.qty)}
                          </TableCell>
                          {isActive && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={removingItemIds.has(item.id) || item.id.startsWith("temp-")}
                                onClick={() => {
                                  if (onRemoveItem) {
                                    onRemoveItem(item.id);
                                  } else {
                                    handleRemoveItem(item.id);
                                  }
                                }}
                              >
                                <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {localService.items.length === 0 && isActive && (
              <div>
                <Label className="text-muted-foreground">Repair Items</Label>
                <p className="text-sm text-muted-foreground">No items added yet</p>
              </div>
            )}

            {localService.items.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Total</span>
                <span className="font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            )}

            {isActive && showActions && (
              <div className="pt-4 mt-4">
                <p className={cn("text-sm font-medium text-center mb-3", roleTone.label)}>
                  Service completion
                </p>
                <div className={`grid gap-3 ${canContactDuringRepair ? "sm:grid-cols-3" : "grid-cols-2"}`}>
                  {canContactDuringRepair && (
                    <ActionTile icon={RiWhatsappLine} label="WhatsApp" onClick={openWhatsApp}
                      variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60" />
                  )}
                  <ActionTile icon={RiCloseCircleLine} label="Gagal Service" onClick={openFailedDialog}
                    variant="outline" className="border-red-300 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60" />
                  <ActionTile icon={RiCheckDoubleLine} label="Selesai Service" onClick={openDoneDialog}
                    className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800" />
                </div>
              </div>
            )}

            {showCustomerHandoffActions && (
              <div className="pt-4 mt-4">
                <p className={cn("text-sm font-medium text-center mb-3", roleTone.label)}>
                  Customer handoff
                </p>
                <div className="flex gap-3">
                  {localService.invoice && (
                    <ActionTile icon={RiFileListLine} label="Invoice" onClick={() => setInvoiceDialogOpen(true)}
                      variant="outline" className="flex-1" />
                  )}
                  {localService.noWa && (
                    <ActionTile icon={RiWhatsappLine} label="WhatsApp" onClick={openWhatsApp}
                      variant="outline" className="flex-1 border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60" />
                  )}
                  {canPayInvoice && (
                    <ActionTile icon={RiMoneyDollarCircleLine} label="Bayar" onClick={() => setPaymentDialogOpen(true)}
                      disabled={isPayingInvoice} className="flex-1 border-amber-400 bg-amber-500 text-white shadow-sm shadow-amber-500/25 hover:bg-amber-600 dark:border-amber-500 dark:bg-amber-600 dark:hover:bg-amber-700" />
                  )}
                  {canMarkPickedUp && (
                    <ActionTile icon={RiLogoutBoxLine} label="Diambil" onClick={handlePickup}
                      disabled={isPickingUp} className="flex-1" />
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={patternDialogOpen} onOpenChange={setPatternDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] overflow-y-auto pr-12 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pattern Lock</DialogTitle>
            <DialogDescription>
              The unlock pattern for this device
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center overflow-hidden rounded-lg border bg-muted/30 p-3 sm:p-4">
              <PatternLock
                width={200}
                height={200}
                pattern={parsePatternString(localService.passwordPattern)}
                animatePattern
                animationKey={animationKey}
                disabled
                showPatternNumbers
              />
            </div>
            {localService.passwordPattern ? (
              <p className="break-words text-center text-sm text-muted-foreground">
                Pattern: {parsePatternString(localService.passwordPattern).join(" → ")}
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No pattern saved
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            {localService.passwordPattern && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnimationKey((prev) => prev + 1)}
                className="w-full sm:w-auto"
              >
                <RiRefreshLine className="h-4 w-4 mr-1" />
                Replay
              </Button>
            )}
            <Button variant="outline" onClick={() => setPatternDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo Completed Status</DialogTitle>
            <DialogDescription>
              Change this service back to an active status if there was a mistake
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select
                value={undoStatus}
                onValueChange={(value) => value && setUndoStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="repairing">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              This will move the task back to the Active tab and clear the completion date.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUndoStatus} disabled={isUndoingStatus}>
              {isUndoingStatus ? "Updating..." : "Confirm Undo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={doneDialogOpen}
        onOpenChange={(open) => {
          if (!open) setShowDoneTakeoverWarning(false);
          setDoneDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selesai Service</DialogTitle>
            <DialogDescription>
              Optionally add a service note before completing this service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {showDoneTakeoverWarning && adminCompletingAssignedToOther && (
              <div className={cn(
                "rounded-md border px-3 py-2 text-sm",
                "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
              )}>
                Service ini sedang ditangani oleh {localService.technician?.name}. Jika dilanjutkan, service akan di-take over dan penanggung jawab berubah ke {currentUser.name}.
              </div>
            )}
            <div>
              <Label htmlFor="done-note">Service Note (optional)</Label>
              <textarea
                id="done-note"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5 resize-none"
                placeholder="Add any notes about the repair..."
                value={doneNote}
                onChange={(e) => setDoneNote(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty-date">Garansi sampai (optional)</Label>
              <Input
                id="warranty-date"
                type="date"
                value={warrantyDate}
                onChange={(event) => setWarrantyDate(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {warrantyPresets.map((preset) => {
                  const presetDate = getPresetWarrantyDate(preset);
                  const isSelected = warrantyDate === presetDate;

                  return (
                    <Button
                      key={preset.label}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      aria-pressed={isSelected}
                      className="w-full"
                      onClick={() => setWarrantyDate(presetDate)}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
                <Button
                  type="button"
                  variant={warrantyDate === "" ? "default" : "outline"}
                  size="sm"
                  aria-pressed={warrantyDate === ""}
                  className="w-full"
                  onClick={() => setWarrantyDate("")}
                >
                  Tanpa garansi
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDoneTakeoverWarning(false);
                setDoneDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkDone}
              disabled={isMarkingDone}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isMarkingDone ? "Marking Done..." : showDoneTakeoverWarning ? "Continue" : "Confirm Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={failedDialogOpen} onOpenChange={setFailedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gagal Service</DialogTitle>
            <DialogDescription>
              Provide a service note explaining why this service failed
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {adminCompletingAssignedService && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                Service ini sedang ditangani oleh {localService.technician?.name}. Menandai gagal tidak akan mengubah penanggung jawab.
              </div>
            )}
            {adminCompletingUnassignedService && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="failed-take-ownership"
                    checked={failedTakeOwnership}
                    onCheckedChange={(checked) => setFailedTakeOwnership(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="failed-take-ownership" className="cursor-pointer leading-relaxed">
                    Saya yang menangani service ini. Dengan melanjutkan, service akan diassign ke {currentUser.name}.
                  </Label>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="failed-note">Service Note</Label>
              <textarea
                id="failed-note"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5 resize-none"
                placeholder="Describe the reason for failure..."
                value={failedNote}
                onChange={(e) => setFailedNote(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFailedDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkFailed}
              disabled={isMarkingFailed || !failedNote.trim() || (adminCompletingUnassignedService && !failedTakeOwnership)}
            >
              {isMarkingFailed ? "Marking Failed..." : "Confirm Failed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddRepairItemForm
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        serviceId={localService.id}
        tokoId={localService.tokoId}
        deviceName={`${localService.hpCatalog.brand.name} ${localService.hpCatalog.modelName}`}
        spareparts={spareparts}
        servicePricelists={servicePricelists}
        onSuccess={() => {
          setItemDialogOpen(false);
          handleAddItemSuccess();
          onRefresh?.();
        }}
        onError={(err) => toast.error(err)}
        onAddItem={handleOptimisticAddItem}
        onAddItemSaved={handleAddItemSaved}
        onAddItemError={handleAddItemRevert}
        onSparepartCreated={async () => {
          const result = await getCompatibleSpareparts(localService.tokoId, localService.hpCatalog.id);
          if (result.success && result.data) setSpareparts(result.data);
        }}
        onPricelistCreated={async () => {
          const result = await getServicePricelists(localService.tokoId);
          if (result.success && result.data) setServicePricelists(result.data);
        }}
      />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoiceTotal={localService.invoice?.grandTotal || 0}
        dpAmount={localService.invoice?.dpAmount || 0}
        isSubmitting={isPayingInvoice}
        onSuccess={openPaidInvoiceDialog}
        onConfirm={handlePayInvoice}
      />
      <InvoiceDialog
        service={viewInvoiceService}
        tokoId={localService.tokoId}
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
      />
    </>
  );
}
