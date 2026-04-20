"use client";

/**
 * ServiceTaskCard - A card component for displaying and managing service tasks
 *
 * FEATURES:
 * - Displays service details: device, customer, complaint, items, invoice
 * - Optimistic UI updates for all mutations (add/remove items, status changes)
 * - Two variants: "active" (for in-progress tasks) and "completed" (for done/picked_up/failed)
 * - Built-in dialogs for marking done/failed, undoing status, adding items, viewing pattern lock
 *
 * OPTIMISTIC UI ARCHITECTURE:
 * This component implements optimistic updates to provide instant feedback while
 * server mutations run in background. The pattern uses:
 *
 * 1. `localTask` state - local copy that receives optimistic updates immediately
 * 2. `pendingMutationsRef` - counter of in-flight mutations
 * 3. `taskFingerprint` - stable identity for prop comparison
 *
 * MUTATION LIFECYCLE:
 * - Before mutation: pendingMutationsRef += 1, apply optimistic update to localTask
 * - During mutation: useEffect skips syncing because pendingMutationsRef > 0
 * - On success: pendingMutationsRef -= 1, call onRefresh() to trigger parent re-fetch
 * - On failure: pendingMutationsRef -= 1, revert localTask to pre-mutation snapshot
 *
 * REQUIRED USAGE:
 * Parent MUST provide `onRefresh` that triggers a silent re-fetch:
 *   onRefresh={() => fetchData(true)}  // silent=true skips loading state
 *
 * Without silent refresh, the loading state will unmount the card and destroy
 * optimistic state, causing items to "reappear" or disappear incorrectly.
 *
 * EXAMPLE:
 * ```tsx
 * <ServiceTaskCard
 *   task={task}
 *   variant="active"
 *   onRefresh={() => fetchTasks(true)}  // MUST be silent re-fetch
 * />
 * ```
 *
 * OPTIONAL PROPS:
 * - `onUpdateStatus`, `onAddItem`, `onRemoveItem`: Override default handlers
 *   for parent-controlled mutations (e.g., when using a shared dialog)
 */

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
} from "@remixicon/react";
import { PatternLock } from "@/components/shared/pattern-lock";
import {
  updateStatus,
  removeItem,
  getCompatibleSpareparts,
  getServicePricelists,
} from "@/actions";
import { AddRepairItemForm } from "@/components/dashboard/services/add-repair-item-form";

// Status badge colors
const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  received: "secondary",
  repairing: "default",
  done: "outline",
  failed: "destructive",
  picked_up: "default",
};

// Status labels
const statusLabels: Record<string, string> = {
  received: "Received",
  repairing: "In Progress",
  done: "Done",
  failed: "Failed",
  picked_up: "Picked Up",
};

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Parse pattern string to array
function parsePatternString(patternStr: string | null): number[] {
  if (!patternStr) return [];
  return patternStr
    .split("-")
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n));
}

export interface ServiceTaskItem {
  id: string;
  tokoId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  passwordPattern: string | null;
  imei: string | null;
  status: string;
  checkinAt: Date;
  doneAt: Date | null;
  hpCatalog: {
    id: string;
    modelName: string;
    brand: {
      name: string;
    };
  };
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
  } | null;
}

export interface ServiceTaskCardProps {
  task: ServiceTaskItem;
  variant?: "active" | "completed";
  onAddItem?: (task: ServiceTaskItem) => void;
  onRemoveItem?: (itemId: string) => void;
  onRefresh?: () => void;
  onStatusChange?: (newStatus: string) => void;
}

export function ServiceTaskCard({
  task,
  variant = "active",
  onAddItem,
  onRemoveItem,
  onRefresh,
  onStatusChange,
}: ServiceTaskCardProps) {
  const isActive = variant === "active";

  // ─── Optimistic local state ────────────────────────────────────────────────
  // We keep a local copy of the task so we can apply optimistic updates
  // immediately. When the parent silently re-fetches and passes a new `task`
  // prop the useEffect below syncs us to the authoritative server data —
  // BUT ONLY when no mutation is currently in-flight. Without this guard,
  // any parent re-render (which creates a new object reference for `task`)
  // would fire the effect and revert the optimistic state, making removed
  // items "reappear" while the server call is still awaited.
  const [localTask, setLocalTask] = useState<ServiceTaskItem>(task);

  // Always-current refs so callbacks can read the latest values without
  // needing them in their dependency arrays (avoids stale closures).
  const localTaskRef = useRef(localTask);
  localTaskRef.current = localTask;

  const taskPropRef = useRef(task);
  taskPropRef.current = task;

  // Counter of in-flight mutations. Incremented before the server call,
  // decremented in `finally`. The effect skips the sync while it is > 0.
  const pendingMutationsRef = useRef(0);

  // Stable identity for the incoming task prop — only changes when the
  // serialised content actually differs, preventing spurious effect runs
  // caused by the parent creating a new object reference on every render.
  const taskFingerprint = useMemo(
    () => JSON.stringify({ id: task.id, status: task.status, items: task.items, doneAt: task.doneAt }),
    [task.id, task.status, task.items, task.doneAt]
  );

  useEffect(() => {
    // Only accept fresh server data when nothing is pending.
    if (pendingMutationsRef.current === 0) {
      setLocalTask(task);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskFingerprint]);

  // ─── Pattern lock dialog ────────────────────────────────────────────────────
  const [patternDialogOpen, setPatternDialogOpen] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);


  // ─── Undo status dialog (for completed tasks) ───────────────────────────────
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [undoStatus, setUndoStatus] = useState<string>("repairing");
  const [isUndoingStatus, setIsUndoingStatus] = useState(false);

  // ─── Add item dialog ────────────────────────────────────────────────────────
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [spareparts, setSpareparts] = useState<
    Array<{ id: string; name: string; defaultPrice: number; stock: number }>
  >([]);
  const [servicePricelists, setServicePricelists] = useState<
    Array<{ id: string; title: string; defaultPrice: number }>
  >([]);

  // Fetch spareparts and pricelists once (only for active cards)
  useEffect(() => {
    if (!isActive) return;
    async function fetchData() {
      try {
        const [sparepartsResult, pricelistsResult] = await Promise.all([
          getCompatibleSpareparts(localTask.tokoId, localTask.hpCatalog.id),
          getServicePricelists(localTask.tokoId),
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
  }, [isActive, localTask.tokoId, localTask.hpCatalog.id]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function openAddItemDialog() {
    setItemDialogOpen(true);
  }

  function openPatternDialog() {
    setPatternDialogOpen(true);
  }

  function openUndoDialog() {
    setUndoStatus("repairing"); // Default to repairing
    setUndoDialogOpen(true);
  }

  const handleUndoStatus = useCallback(async () => {
    if (!undoStatus) return;
    setIsUndoingStatus(true);

    // Read the latest localTask via ref — avoids stale closure issues
    const snapshot = localTaskRef.current;

    // Block useEffect sync while the mutation is in-flight
    pendingMutationsRef.current += 1;

    // --- Optimistic update ---
    setLocalTask((prev) => ({
      ...prev,
      status: undoStatus,
      doneAt: null, // Clear doneAt when undoing
    }));

    try {
      const result = await updateStatus(snapshot.id, undoStatus as "received" | "repairing");
      if (result.success) {
        setUndoDialogOpen(false);
        // Allow the next prop change (from the silent re-fetch) to sync
        pendingMutationsRef.current -= 1;
        onRefresh?.();
      } else {
        pendingMutationsRef.current -= 1;
        setLocalTask(snapshot);
      }
    } catch (err) {
      console.error("Error undoing status:", err);
      pendingMutationsRef.current -= 1;
      setLocalTask(snapshot);
    } finally {
      setIsUndoingStatus(false);
    }
  }, [undoStatus, onRefresh]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    // Read the latest localTask via ref — avoids stale closure issues
    const snapshot = localTaskRef.current;

    // Block useEffect sync while the mutation is in-flight
    pendingMutationsRef.current += 1;

    // --- Optimistic update ---
    setLocalTask((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));

    try {
      const result = await removeItem(itemId);
      if (result.success) {
        // Allow the next prop change (from the silent re-fetch) to sync
        pendingMutationsRef.current -= 1;
        onRefresh?.();
      } else {
        pendingMutationsRef.current -= 1;
        setLocalTask(snapshot);
      }
    } catch (err) {
      console.error("Error removing item:", err);
      pendingMutationsRef.current -= 1;
      setLocalTask(snapshot);
    }
  }, [onRefresh]);

  // Called by AddRepairItemForm for optimistic add (before server call)
  const handleOptimisticAddItem = useCallback(
    (newItem: { id: string; type: string; name: string; qty: number; price: number }) => {
      pendingMutationsRef.current += 1;
      setLocalTask((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    },
    []
  );

  // Called by AddRepairItemForm on server success — unblocks the sync so the
  // next prop update (with the real server ID) will be accepted.
  const handleAddItemSuccess = useCallback(() => {
    pendingMutationsRef.current -= 1;
  }, []);

  // Called by AddRepairItemForm when the server request fails so we can
  // revert the optimistic add.
  const handleAddItemRevert = useCallback(() => {
    pendingMutationsRef.current -= 1;
    // Sync back to whatever the server prop currently says (via ref to avoid stale closure)
    setLocalTask(taskPropRef.current);
  }, []);

  // ─── Derived values ────────────────────────────────────────────────────────
  const totalAmount = localTask.items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  // ─── Done dialog ────────────────────────────────────────────────────────────
  const [doneDialogOpen, setDoneDialogOpen] = useState(false);
  const [doneNote, setDoneNote] = useState("");
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  // ─── Failed dialog ─────────────────────────────────────────────────────────
  const [failedDialogOpen, setFailedDialogOpen] = useState(false);
  const [failedNote, setFailedNote] = useState("");
  const [isMarkingFailed, setIsMarkingFailed] = useState(false);

  function openDoneDialog() {
    setDoneNote("");
    setDoneDialogOpen(true);
  }

  const handleMarkDone = useCallback(async () => {
    setIsMarkingDone(true);

    const snapshot = localTaskRef.current;

    // Block useEffect sync while the mutation is in-flight
    pendingMutationsRef.current += 1;

    // --- Optimistic update ---
    setLocalTask((prev) => ({
      ...prev,
      status: "done",
      doneAt: new Date(),
    }));

    try {
      const result = await updateStatus(
        snapshot.id,
        "done",
        doneNote.trim() || undefined
      );
      if (result.success) {
        setDoneDialogOpen(false);
        pendingMutationsRef.current -= 1;
        onRefresh?.();
        onStatusChange?.("done");
      } else {
        pendingMutationsRef.current -= 1;
        setLocalTask(snapshot);
      }
    } catch (err) {
      console.error("Error marking as done:", err);
      pendingMutationsRef.current -= 1;
      setLocalTask(snapshot);
    } finally {
      setIsMarkingDone(false);
    }
  }, [doneNote, onRefresh]);

  function openFailedDialog() {
    setFailedNote("");
    setFailedDialogOpen(true);
  }

  const handleMarkFailed = useCallback(async () => {
    if (!failedNote.trim()) return;
    setIsMarkingFailed(true);

    const snapshot = localTaskRef.current;

    // Block useEffect sync while the mutation is in-flight
    pendingMutationsRef.current += 1;

    // --- Optimistic update ---
    setLocalTask((prev) => ({
      ...prev,
      status: "failed",
      doneAt: new Date(),
    }));

    try {
      const result = await updateStatus(snapshot.id, "failed", failedNote.trim());
      if (result.success) {
        setFailedDialogOpen(false);
        pendingMutationsRef.current -= 1;
        onRefresh?.();
        onStatusChange?.("failed");
      } else {
        pendingMutationsRef.current -= 1;
        setLocalTask(snapshot);
      }
    } catch (err) {
      console.error("Error marking as failed:", err);
      pendingMutationsRef.current -= 1;
      setLocalTask(snapshot);
    } finally {
      setIsMarkingFailed(false);
    }
  }, [failedNote, onRefresh]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <span className="break-words">
                  {localTask.hpCatalog.brand.name} {localTask.hpCatalog.modelName}
                </span>
                <Badge variant={statusColors[localTask.status] || "outline"}>
                  {statusLabels[localTask.status] || localTask.status}
                </Badge>
              </CardTitle>
              <CardDescription className="break-words">
                {localTask.customerName || "No customer name"} • {localTask.noWa}
              </CardDescription>
            </div>
            {isActive && (
              <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  className="w-full xs:w-auto"
                  onClick={() => {
                    if (onAddItem) {
                      onAddItem(localTask);
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
            {!isActive && (localTask.status === "done" || localTask.status === "picked_up" || localTask.status === "failed") && (
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
            {/* Complaint */}
            <div>
              <Label className="text-muted-foreground">Complaint</Label>
              <p className="text-sm">{localTask.complaint}</p>
            </div>

            {/* Password / Pattern - only show for active tasks */}
            {isActive && (localTask.passwordPattern || localTask.imei) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {localTask.passwordPattern && (
                  <div>
                    <Label className="text-muted-foreground">Password / Pattern</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {localTask.passwordPattern.includes("-") ? (
                        <>
                          <Badge variant="outline" className="font-mono">
                            Pattern: {parsePatternString(localTask.passwordPattern).join(" → ")}
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
                          {localTask.passwordPattern}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {localTask.imei && (
                  <div>
                    <Label className="text-muted-foreground">IMEI</Label>
                    <p className="text-sm font-mono">{localTask.imei}</p>
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            {localTask.items.length > 0 && (
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
                    {localTask.items.map((item) => (
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

            {localTask.items.length === 0 && isActive && (
              <div>
                <Label className="text-muted-foreground">Repair Items</Label>
                <p className="text-sm text-muted-foreground">No items added yet</p>
              </div>
            )}

            {/* Total */}
            {localTask.items.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Total</span>
                <span className="font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            )}

            {/* Invoice info */}
            {localTask.invoice && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-muted-foreground">
                  {isActive ? "Invoice Status" : "Invoice"}
                </span>
                <div className="flex items-center gap-2">
                  {!isActive && (
                    <span>{formatCurrency(localTask.invoice.grandTotal)}</span>
                  )}
                  <Badge
                    variant={
                      localTask.invoice.paymentStatus === "paid"
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {localTask.invoice.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <div>Check-in: {formatDate(localTask.checkinAt)}</div>
              {localTask.doneAt && <div>Done: {formatDate(localTask.doneAt)}</div>}
            </div>

            {/* Done & Failed buttons – bottom-right for active tasks */}
            {isActive && (
              <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                <Button
                  size="sm"
                  onClick={openFailedDialog}
                  variant="destructive"
                >
                  <RiCloseCircleLine className="h-4 w-4 mr-1" />
                  Gagal Servis
                </Button>
                <Button
                  size="sm"
                  onClick={openDoneDialog}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <RiCheckDoubleLine className="h-4 w-4 mr-1" />
                  Selesai Servis
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pattern Lock View Dialog */}
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
                pattern={parsePatternString(localTask.passwordPattern)}
                animatePattern
                animationKey={animationKey}
                disabled
                showPatternNumbers
              />
            </div>
            {localTask.passwordPattern ? (
              <p className="text-center text-sm text-muted-foreground">
                Pattern: {parsePatternString(localTask.passwordPattern).join(" → ")}
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No pattern saved
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {localTask.passwordPattern && (
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

      {/* Undo Status Dialog */}
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

      {/* Mark Done Dialog */}
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

      {/* Mark Failed Dialog */}
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

      {/* Add Item Dialog */}
      <AddRepairItemForm
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        serviceId={localTask.id}
        spareparts={spareparts}
        servicePricelists={servicePricelists}
        onSuccess={() => {
          setItemDialogOpen(false);
          // Unblock useEffect sync, then trigger silent re-fetch so the
          // real server item (with actual ID) replaces the temp-* one.
          handleAddItemSuccess();
          onRefresh?.();
        }}
        onError={(err) => console.error("Error adding item:", err)}
        onAddItem={handleOptimisticAddItem}
        onAddItemError={handleAddItemRevert}
      />
    </>
  );
}
