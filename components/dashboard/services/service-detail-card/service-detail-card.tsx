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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@remixicon/react";
import { PatternLock } from "@/components/shared/pattern-lock";
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
import { useFeatureAccess } from "@/components/dashboard/layout/feature-access-context";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const roleToneClasses = {
  admin: {
    card: "border-primary/20 bg-gradient-to-br from-primary/[0.035] via-background to-background",
    rail: "from-primary/40 to-primary/10",
    label: "text-primary",
  },
  staff: {
    card: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] via-background to-background",
    rail: "from-emerald-500/40 to-emerald-500/10",
    label: "text-emerald-700 dark:text-emerald-400",
  },
  technician: {
    card: "border-sky-500/20 bg-gradient-to-br from-sky-500/[0.04] via-background to-background",
    rail: "from-sky-500/40 to-sky-500/10",
    label: "text-sky-700 dark:text-sky-400",
  },
} satisfies Record<"admin" | "staff" | "technician", { card: string; rail: string; label: string }>;

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
    dpAmount?: number | null;
  } | null;
}

export interface ServiceDetailCardProps {
  service: ServiceDetailCardItem;
  variant?: "active" | "completed";
  viewerRole?: "admin" | "staff" | "technician";
  showActions?: boolean;
  onAddItem?: (service: ServiceDetailCardItem) => void;
  onRemoveItem?: (itemId: string) => void;
  onRefresh?: () => void;
  onStatusChange?: (newStatus: string) => void;
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
}: ServiceDetailCardProps) {
  const isActive = variant === "active";
  const { inventoryEnabled, invoiceEnabled } = useFeatureAccess();
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
    Array<{ id: string; name: string; defaultPrice: number; stock: number }>
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

    const snapshot = localServiceRef.current;

    pendingMutationsRef.current += 1;

    setLocalService((prev) => ({
      ...prev,
      status: undoStatus,
      doneAt: null,
    }));

    try {
      const result = await updateStatus(snapshot.id, undoStatus as "received" | "repairing");
      if (result.success) {
        setUndoDialogOpen(false);
        pendingMutationsRef.current -= 1;
        onRefresh?.();
      } else {
        pendingMutationsRef.current -= 1;
        setLocalService(snapshot);
      }
    } catch (err) {
      console.error("Error undoing status:", err);
      pendingMutationsRef.current -= 1;
      setLocalService(snapshot);
    } finally {
      setIsUndoingStatus(false);
    }
  }, [undoStatus, onRefresh]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    const snapshot = localServiceRef.current;

    pendingMutationsRef.current += 1;

    setLocalService((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));

    try {
      const result = await removeItem(itemId);
      if (result.success) {
        pendingMutationsRef.current -= 1;
        onRefresh?.();
      } else {
        pendingMutationsRef.current -= 1;
        setLocalService(snapshot);
      }
    } catch (err) {
      console.error("Error removing item:", err);
      pendingMutationsRef.current -= 1;
      setLocalService(snapshot);
    }
  }, [onRefresh]);

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

  const hasCompletedStatus = localService.status === "done" || localService.status === "failed";
  const canPayInvoice = invoiceEnabled && canHandleCustomerHandoff && hasCompletedStatus && !localService.isPickedUp && (localService.invoice?.paymentStatus === "unpaid" || localService.invoice?.paymentStatus === "dp");
  const canMarkPickedUp = canHandleCustomerHandoff && hasCompletedStatus && !localService.isPickedUp;
  const canContactDuringRepair = (localService.status === "received" || localService.status === "repairing") && Boolean(localService.noWa);
  const showCustomerHandoffActions = canHandleCustomerHandoff && hasCompletedStatus && (Boolean(localService.noWa) || canPayInvoice || canMarkPickedUp);
  const customerHandoffActionCount = Number(canPayInvoice) + Number(Boolean(localService.noWa)) + Number(canMarkPickedUp);
  const customerHandoffGridClass = customerHandoffActionCount >= 4
    ? "lg:grid-cols-4"
    : customerHandoffActionCount === 3
      ? "lg:grid-cols-3"
      : "lg:grid-cols-2";

  function openDoneDialog() {
    setDoneNote("");
    setDoneDialogOpen(true);
  }

  async function handleMarkDone() {
    setIsMarkingDone(true);

    const snapshot = localServiceRef.current;
    const doneNoteValue = doneNote.trim();

    pendingMutationsRef.current += 1;

    setLocalService((prev) => ({
      ...prev,
      status: "done",
      doneAt: new Date(),
    }));

    try {
      const result = await updateStatus(
        snapshot.id,
        "done",
        doneNoteValue || undefined
      );
      if (result.success) {
        setDoneDialogOpen(false);
        pendingMutationsRef.current -= 1;
        onRefresh?.();
        onStatusChange?.("done");
      } else {
        pendingMutationsRef.current -= 1;
        setLocalService(snapshot);
      }
    } catch (err) {
      console.error("Error marking as done:", err);
      pendingMutationsRef.current -= 1;
      setLocalService(snapshot);
    } finally {
      setIsMarkingDone(false);
    }
  }

  function openFailedDialog() {
    setFailedNote("");
    setFailedDialogOpen(true);
  }

  async function handleMarkFailed() {
    if (!failedNote.trim()) return;
    setIsMarkingFailed(true);

    const snapshot = localServiceRef.current;
    const failedNoteValue = failedNote.trim();

    pendingMutationsRef.current += 1;

    setLocalService((prev) => ({
      ...prev,
      status: "failed",
      doneAt: new Date(),
    }));

    try {
      const result = await updateStatus(snapshot.id, "failed", failedNoteValue || undefined);
      if (result.success) {
        setFailedDialogOpen(false);
        pendingMutationsRef.current -= 1;
        onRefresh?.();
        onStatusChange?.("failed");
      } else {
        pendingMutationsRef.current -= 1;
        setLocalService(snapshot);
      }
    } catch (err) {
      console.error("Error marking as failed:", err);
      pendingMutationsRef.current -= 1;
      setLocalService(snapshot);
    } finally {
      setIsMarkingFailed(false);
    }
  }

  function openWhatsApp() {
    const normalized = localService.noWa.replace(/\D/g, "").replace(/^0/, "62");
    if (!normalized) return;
    window.open(`https://wa.me/${normalized}`, "_blank", "noopener,noreferrer");
  }

  async function handlePayInvoice() {
    if (!localService.invoice || !canPayInvoice) return false;
    setIsPayingInvoice(true);

    const snapshot = localServiceRef.current;
    pendingMutationsRef.current += 1;
    setLocalService((prev) => prev.invoice ? {
      ...prev,
      invoice: { ...prev.invoice, paymentStatus: "paid" },
    } : prev);

    try {
      const result = await payInvoice(localService.invoice.id);
      if (result.success) {
        toast.success("Invoice ditandai lunas");
        pendingMutationsRef.current -= 1;
        onRefresh?.();
        return true;
      } else {
        toast.error(result.error || "Gagal menandai invoice lunas");
        pendingMutationsRef.current -= 1;
        setLocalService(snapshot);
        return false;
      }
    } catch (err) {
      console.error("Error paying invoice:", err);
      toast.error("Gagal menandai invoice lunas");
      pendingMutationsRef.current -= 1;
      setLocalService(snapshot);
      return false;
    } finally {
      setIsPayingInvoice(false);
    }
  }

  async function handlePickup() {
    if (!canMarkPickedUp) return;
    setIsPickingUp(true);

    const snapshot = localServiceRef.current;
    const checkoutAt = new Date();
    pendingMutationsRef.current += 1;
    setLocalService((prev) => ({ ...prev, isPickedUp: true, checkoutAt }));

    try {
      const result = await pickupService(localService.id);
      if (result.success) {
        toast.success("Service ditandai sudah diambil");
        pendingMutationsRef.current -= 1;
        onRefresh?.();
      } else {
        toast.error(result.error || "Gagal menandai service diambil");
        pendingMutationsRef.current -= 1;
        setLocalService(snapshot);
      }
    } catch (err) {
      console.error("Error picking up service:", err);
      toast.error("Gagal menandai service diambil");
      pendingMutationsRef.current -= 1;
      setLocalService(snapshot);
    } finally {
      setIsPickingUp(false);
    }
  }

  return (
    <>
      <Card className={cn("relative overflow-hidden", roleTone.card)}>
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r", roleTone.rail)} />
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <span className="break-words">
                  {localService.hpCatalog.brand.name} {localService.hpCatalog.modelName}
                </span>
                <Badge variant={statusColors[localService.status] || "outline"}>
                  {statusLabels[localService.status] || localService.status}
                </Badge>
                {localService.technician ? (
                  <Badge variant="outline" className="border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-400">
                    Teknisi: {localService.technician.name}
                  </Badge>
                ) : localService.status === "received" ? (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Belum ada teknisi
                  </Badge>
                ) : null}
                {localService.isPickedUp && <Badge variant="outline">Picked Up</Badge>}
                {localService.invoice && (
                  <Badge
                    variant={
                      localService.invoice.paymentStatus === "paid"
                        ? "outline"
                        : localService.invoice.paymentStatus === "dp"
                          ? "accent"
                          : "destructive"
                    }
                  >
                    {isActive ? "Invoice" : formatCurrency(localService.invoice.grandTotal)} • {localService.invoice.paymentStatus === "paid" ? "Paid" : localService.invoice.paymentStatus === "dp" ? `DP ${localService.invoice.dpAmount ? formatCurrency(localService.invoice.dpAmount) : ""}` : "Unpaid"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="break-words">
                {localService.customerName || "No customer name"} • {localService.noWa}
              </CardDescription>
              <p className="text-xs text-muted-foreground">
                Check-in: {formatDate(localService.checkinAt)}
              </p>
            </div>
            {isActive && showActions && (
              <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  className="w-full xs:w-auto"
                  onClick={() => {
                    if (onAddItem) {
                      onAddItem(localService);
                    } else {
                      openAddItemDialog();
                    }
                  }}
                >
                  <RiAddLine className="h-4 w-4 xs:mr-1" />
                  <span className="xs:inline">Tambah Sparepart & jasa</span>
                </Button>
              </div>
            )}
            {!isActive && (localService.status === "done" || localService.status === "failed") && (
              <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full xs:w-auto"
                  onClick={openUndoDialog}
                >
                  <RiArrowGoBackLine className="h-4 w-4 xs:mr-1" />
                  <span className="xs:inline">Undo</span>
                </Button>
              </div>
            )}
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
                    <div className="flex items-center gap-2 mt-1">
                      {localService.passwordPattern.includes("-") ? (
                        <>
                          <Badge variant="outline" className="font-mono">
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
                        <Badge variant="outline" className="font-mono">
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
                <Table>
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
                    <Button
                      variant="outline"
                      onClick={openWhatsApp}
                      className="flex-col h-auto py-3 gap-1.5 border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
                    >
                      <RiWhatsappLine className="h-5 w-5" />
                      <span className="text-xs font-medium">WhatsApp</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={openFailedDialog}
                    className="flex-col h-auto py-3 gap-1.5 border-red-300 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
                  >
                    <RiCloseCircleLine className="h-5 w-5" />
                    <span className="text-xs font-medium">Mark as Failed</span>
                  </Button>
                  <Button
                    onClick={openDoneDialog}
                    className="flex-col h-auto py-3 gap-1.5 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                  >
                    <RiCheckDoubleLine className="h-5 w-5" />
                    <span className="text-xs font-medium">Mark as Done</span>
                  </Button>
                </div>
              </div>
            )}

            {showCustomerHandoffActions && (
              <div className="pt-4 mt-4">
                <p className={cn("text-sm font-medium text-center mb-3", roleTone.label)}>
                  Customer handoff
                </p>
                <div className={`grid gap-3 sm:grid-cols-2 ${customerHandoffGridClass}`}>
                  {canPayInvoice && (
                    <Button
                      variant="outline"
                      disabled={isPayingInvoice}
                      onClick={() => setPaymentDialogOpen(true)}
                      className="flex-col h-auto py-3 gap-1.5"
                    >
                      <RiMoneyDollarCircleLine className="h-5 w-5" />
                      <span className="text-xs font-medium">Bayar</span>
                    </Button>
                  )}
                  {localService.noWa && (
                    <Button
                      variant="outline"
                      onClick={openWhatsApp}
                      className="flex-col h-auto py-3 gap-1.5 border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
                    >
                      <RiWhatsappLine className="h-5 w-5" />
                      <span className="text-xs font-medium">WhatsApp</span>
                    </Button>
                  )}
                  {canMarkPickedUp && (
                    <Button
                      disabled={isPickingUp}
                      onClick={handlePickup}
                      className="flex-col h-auto py-3 gap-1.5"
                    >
                      <RiLogoutBoxLine className="h-5 w-5" />
                      <span className="text-xs font-medium">Diambil</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={patternDialogOpen} onOpenChange={setPatternDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pattern Lock</DialogTitle>
            <DialogDescription>
              The unlock pattern for this device
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-muted/30 rounded-lg border">
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
              <p className="text-center text-sm text-muted-foreground">
                Pattern: {parsePatternString(localService.passwordPattern).join(" → ")}
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No pattern saved
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {localService.passwordPattern && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnimationKey((prev) => prev + 1)}
              >
                <RiRefreshLine className="h-4 w-4 mr-1" />
                Replay
              </Button>
            )}
            <Button variant="outline" onClick={() => setPatternDialogOpen(false)}>
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
        spareparts={spareparts}
        servicePricelists={servicePricelists}
        onSuccess={() => {
          setItemDialogOpen(false);
          handleAddItemSuccess();
          onRefresh?.();
        }}
        onError={(err) => console.error("Error adding item:", err)}
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
    </>
  );
}
