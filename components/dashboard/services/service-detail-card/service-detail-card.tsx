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
import { Label } from "@/components/ui/label";
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
import { StatusUpdateDialog } from "@/components/dashboard/services/status-update-dialog";
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
  includedItems?: string[] | null;
  passwordPattern: string | null;
  imei: string | null;
  status: string;
  isPickedUp?: boolean;
  checkinAt: Date;
  doneAt: Date | null;
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
  const { inventoryEnabled } = useDashboardScope();
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
    }),
    [service.id, service.status, service.isPickedUp, service.checkoutAt, service.items, service.doneAt]
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
      optimistic: (prev) => ({ ...prev, status: undoStatus, doneAt: null }),
      action: () => updateStatus(localServiceRef.current.id, undoStatus as "received" | "repairing"),
      onSuccess: () => { setUndoDialogOpen(false); onRefresh?.(); },
    });
    setIsUndoingStatus(false);
  }, [undoStatus, onRefresh, mutate]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    await mutate({
      optimistic: (prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }),
      action: () => removeItem(itemId),
      onSuccess: () => onRefresh?.(),
    });
  }, [mutate, onRefresh]);

  const handleOptimisticAddItem = useCallback(
    (newItem: { id: string; type: string; name: string; qty: number; price: number }) => {
      pendingMutationsRef.current += 1;
      setLocalService((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    },
    []
  );

  const handleAddItemSuccess = useCallback(() => {
    pendingMutationsRef.current -= 1;
  }, []);

  const handleAddItemRevert = useCallback(() => {
    pendingMutationsRef.current -= 1;
    setLocalService(servicePropRef.current);
  }, []);

  const totalAmount = localService.items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const [doneDialogOpen, setDoneDialogOpen] = useState(false);
  const [doneNote, setDoneNote] = useState("");
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  const [failedDialogOpen, setFailedDialogOpen] = useState(false);
  const [failedNote, setFailedNote] = useState("");
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
      includedItems: localService.includedItems,
      status: localService.status,
      isPickedUp: localService.isPickedUp,
      checkinAt: localService.checkinAt,
      doneAt: localService.doneAt,
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
  const canMarkPickedUp = canHandleCustomerHandoff && hasCompletedStatus && !localService.isPickedUp;
  const canContactDuringRepair = (localService.status === "received" || localService.status === "repairing") && Boolean(localService.noWa);
  const showCustomerHandoffActions = canHandleCustomerHandoff && hasCompletedStatus && (Boolean(localService.noWa) || canPayInvoice || canMarkPickedUp || Boolean(localService.invoice));

  function openDoneDialog() {
    setDoneNote("");
    setDoneDialogOpen(true);
  }

  async function handleMarkDone() {
    setIsMarkingDone(true);
    const doneNoteValue = doneNote.trim();
    await mutate({
      optimistic: (prev) => ({ ...prev, status: "done", doneAt: new Date() }),
      action: () => updateStatus(localServiceRef.current.id, "done", doneNoteValue || undefined),
      onSuccess: () => { setDoneDialogOpen(false); onRefresh?.(); onStatusChange?.("done"); },
    });
    setIsMarkingDone(false);
  }

  function openFailedDialog() {
    setFailedNote("");
    setFailedDialogOpen(true);
  }

  async function handleMarkFailed() {
    if (!failedNote.trim()) return;
    setIsMarkingFailed(true);
    const failedNoteValue = failedNote.trim();
    await mutate({
      optimistic: (prev) => ({ ...prev, status: "failed", doneAt: new Date() }),
      action: () => updateStatus(localServiceRef.current.id, "failed", failedNoteValue || undefined),
      onSuccess: () => { setFailedDialogOpen(false); onRefresh?.(); onStatusChange?.("failed"); },
    });
    setIsMarkingFailed(false);
  }

  function openWhatsApp() {
    const normalized = localService.noWa.replace(/\D/g, "").replace(/^0/, "62");
    if (!normalized) return;
    window.open(`https://wa.me/${normalized}`, "_blank", "noopener,noreferrer");
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
              <Label className="text-muted-foreground">Complaint</Label>
              <p className="text-sm">{localService.complaint}</p>
            </div>

            {localService.includedItems && localService.includedItems.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Included Items</Label>
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
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">{item.type}</Badge>
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
                  <ActionTile icon={RiCloseCircleLine} label="Mark as Failed" onClick={openFailedDialog}
                    variant="outline" className="border-red-300 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60" />
                  <ActionTile icon={RiCheckDoubleLine} label="Mark as Done" onClick={openDoneDialog}
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
                  {canPayInvoice && (
                    <ActionTile icon={RiMoneyDollarCircleLine} label="Bayar" onClick={() => setPaymentDialogOpen(true)}
                      variant="outline" disabled={isPayingInvoice} className="flex-1" />
                  )}
                  {localService.noWa && (
                    <ActionTile icon={RiWhatsappLine} label="WhatsApp" onClick={openWhatsApp}
                      variant="outline" className="flex-1 border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60" />
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

      <Dialog open={doneDialogOpen} onOpenChange={setDoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Service as Done</DialogTitle>
            <DialogDescription>
              Optionally add a service note before completing this service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkDone}
              disabled={isMarkingDone}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isMarkingDone ? "Marking Done..." : "Confirm Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={failedDialogOpen} onOpenChange={setFailedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Service as Failed</DialogTitle>
            <DialogDescription>
              Provide a service note explaining why this service failed
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
              disabled={isMarkingFailed || !failedNote.trim()}
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
