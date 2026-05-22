"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteAdminAccountCascade,
  getAdminDeletionPreview,
  grantUserProTrial,
  updateUserMonthlyPriceOverride,
  updateUserSubscription,
  type AdminDeletionPreview,
  type SuperuserUserRow,
} from "@/actions/superuser";
import type { SubscriptionPlan } from "@/lib/features";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminDetailCard } from "@/components/superuser/admin-detail-card";
import { RiAlertLine, RiDeleteBinLine, RiMoneyDollarCircleLine } from "@remixicon/react";

interface UserManagementTableProps {
  users: SuperuserUserRow[];
}

export function UserManagementTable({ users }: UserManagementTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<SuperuserUserRow | null>(null);
  const [deletionPreview, setDeletionPreview] = useState<AdminDeletionPreview | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [deletedUserIds, setDeletedUserIds] = useState<Set<string>>(() => new Set());
  const [detailTarget, setDetailTarget] = useState<SuperuserUserRow | null>(null);
  const [priceTarget, setPriceTarget] = useState<SuperuserUserRow | null>(null);
  const [monthlyPriceInput, setMonthlyPriceInput] = useState("");

  const visibleUsers = users.filter((user) => !deletedUserIds.has(user.id));

  const handlePlanChange = (userId: string, plan: SubscriptionPlan) => {
    startTransition(async () => {
      let enterpriseAmount: number | undefined;
      if (plan === "enterprise") {
        enterpriseAmount = Number(window.prompt("Enterprise subscription amount for 10% affiliate commission", "0") ?? 0);
        if (!Number.isFinite(enterpriseAmount) || enterpriseAmount <= 0) {
          toast.error("Enterprise amount is required");
          return;
        }
      }

      const result = await updateUserSubscription(userId, plan, enterpriseAmount);
      if (!result.success) {
        toast.error(result.error || "Failed to update subscription");
        return;
      }
      toast.success("Subscription updated");
    });
  };

  const handleGrantTrial = (userId: string) => {
    startTransition(async () => {
      const result = await grantUserProTrial(userId);
      if (!result.success) {
        toast.error(result.error || "Failed to grant Pro trial");
        return;
      }
      toast.success("Pro trial granted");
    });
  };

  const handleOpenDelete = (target: SuperuserUserRow) => {
    setDeleteTarget(target);
    setDeletionPreview(null);
    setConfirmationEmail("");
    startTransition(async () => {
      const result = await getAdminDeletionPreview(target.id);
      if (!result.success) {
        toast.error(result.error || "Failed to load deletion preview");
        setDeleteTarget(null);
        return;
      }
      setDeletionPreview(result.data ?? null);
    });
  };

  const handleOpenPricing = (target: SuperuserUserRow) => {
    setPriceTarget(target);
    setMonthlyPriceInput(String(target.monthlyPriceOverride ?? target.estimatedMonthlyPrice ?? ""));
  };

  const handleUpdateMonthlyPrice = (monthlyPriceOverride: number | null) => {
    if (!priceTarget) return;
    startTransition(async () => {
      const result = await updateUserMonthlyPriceOverride(priceTarget.id, monthlyPriceOverride);
      if (!result.success) {
        toast.error(result.error || "Failed to update monthly price");
        return;
      }
      toast.success(monthlyPriceOverride === null ? "Monthly price reset to default" : "Monthly price updated");
      setPriceTarget(null);
      setMonthlyPriceInput("");
      router.refresh();
    });
  };

  const handleSaveMonthlyPrice = () => {
    const amount = Number(monthlyPriceInput.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Monthly price must be greater than zero");
      return;
    }
    handleUpdateMonthlyPrice(amount);
  };

  const handleDeleteAdmin = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteAdminAccountCascade(deleteTarget.id, confirmationEmail);
      if (!result.success) {
        toast.error(result.error || "Failed to delete admin account");
        return;
      }
      setDeletedUserIds((current) => new Set(current).add(deleteTarget.id));
      toast.success(`Admin ${deleteTarget.email} deleted`);
      setDeleteTarget(null);
      setDeletionPreview(null);
      setConfirmationEmail("");
    });
  };

  const canDelete = Boolean(deleteTarget && deletionPreview && confirmationEmail.trim().toLowerCase() === deleteTarget.email.toLowerCase());

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, user: SuperuserUserRow) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setDetailTarget(user);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Monthly Price</TableHead>
              <TableHead>Active Until</TableHead>
              <TableHead>Trial</TableHead>
              <TableHead>Toko Count</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Technicians</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.map((user) => (
              <TableRow
                key={user.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer border-border/30 hover:bg-muted/40"
                onClick={() => setDetailTarget(user)}
                onKeyDown={(event) => handleRowKeyDown(event, user)}
              >
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  <Select
                    defaultValue={user.plan}
                    disabled={isPending}
                    onValueChange={(value) => handlePlanChange(user.id, value as SubscriptionPlan)}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="premium">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing" ? "success" : user.subscriptionStatus === "past_due" ? "warning" : "outline"}>
                    {user.subscriptionStatus ?? "-"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium tabular-nums">{user.estimatedMonthlyPrice !== null ? formatRupiah(user.estimatedMonthlyPrice) : "Custom"}</span>
                    {user.monthlyPriceOverride !== null ? <Badge variant="accent" className="w-fit">Custom</Badge> : <span className="text-xs text-muted-foreground">Default</span>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString("id-ID") : "-"}
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  {user.subscriptionStatus === "trialing" && user.trialEndsAt ? (
                    <Badge variant="warning">Until {new Date(user.trialEndsAt).toLocaleDateString("id-ID")}</Badge>
                  ) : user.proTrialStartedAt ? (
                    <Badge variant="outline">Used</Badge>
                  ) : (
                    <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleGrantTrial(user.id)}>
                      Grant Pro Trial
                    </Button>
                  )}
                </TableCell>
                <TableCell>{user.storeCount}</TableCell>
                <TableCell>{user.staffCount}</TableCell>
                <TableCell>{user.technicianCount}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleOpenPricing(user)}>
                      <RiMoneyDollarCircleLine data-icon="inline-start" />
                      Price
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={isPending} onClick={() => handleOpenDelete(user)}>
                      <RiDeleteBinLine data-icon="inline-start" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Drawer open={Boolean(detailTarget)} onOpenChange={(open) => !open && setDetailTarget(null)} direction="bottom">
        <DrawerContent className="mx-auto grid max-h-dvh w-full min-w-0 max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0 before:inset-0 before:rounded-t-xl before:rounded-b-none data-[vaul-drawer-direction=bottom]:max-h-dvh sm:max-h-[90dvh] sm:data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>Admin detail</DrawerTitle>
            <DrawerDescription>Summary toko, service, revenue, staff, and plan status for this admin.</DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="min-h-0">
            <div className="p-4">
              {detailTarget && <AdminDetailCard admin={detailTarget} />}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      <Dialog open={Boolean(priceTarget)} onOpenChange={(open) => !open && setPriceTarget(null)}>
        <DialogContent className="max-w-md sm:min-w-md">
          <DialogHeader>
            <DialogTitle>Monthly admin price</DialogTitle>
            <DialogDescription>
              Set a fixed monthly Pro price for this admin. Future invoices use this amount; existing invoices stay unchanged.
            </DialogDescription>
          </DialogHeader>

          {priceTarget && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{priceTarget.name}</div>
                <div className="text-muted-foreground">{priceTarget.email}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-price-override">Monthly price</Label>
                <Input
                  id="monthly-price-override"
                  inputMode="numeric"
                  value={monthlyPriceInput}
                  onChange={(event) => setMonthlyPriceInput(event.target.value)}
                  placeholder="990000"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Current effective price: {priceTarget.estimatedMonthlyPrice !== null ? formatRupiah(priceTarget.estimatedMonthlyPrice) : "Custom"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => handleUpdateMonthlyPrice(null)} disabled={isPending || !priceTarget?.monthlyPriceOverride}>
              Reset default
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPriceTarget(null)} disabled={isPending}>Cancel</Button>
              <Button onClick={handleSaveMonthlyPrice} disabled={isPending}>{isPending ? "Saving..." : "Save price"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-4xl sm:min-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <RiAlertLine className="size-5" />
              Delete Admin Account
            </DialogTitle>
            <DialogDescription>
              This permanently removes the admin account, assigned tokos, toko services, inventory, staff/technicians only assigned to those tokos, and referred-customer affiliate history for this admin.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{deleteTarget.name}</div>
                <div className="text-muted-foreground">{deleteTarget.email}</div>
              </div>

              {!deletionPreview ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Loading deletion preview...
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <PreviewItem label="Tokos" value={deletionPreview.counts.tokos} />
                  <PreviewItem label="Services" value={deletionPreview.counts.services} />
                  <PreviewItem label="Spareparts" value={deletionPreview.counts.inventoryItems} />
                  <PreviewItem label="Retail sales" value={deletionPreview.counts.salesOrders} />
                  <PreviewItem label="Warranty claims" value={deletionPreview.counts.warrantyClaims} />
                  <PreviewItem label="Supplier returns" value={deletionPreview.counts.supplierReturns} />
                  <PreviewItem label="Inventory audits" value={deletionPreview.counts.inventoryAuditSessions} />
                  <PreviewItem label="Stock movements" value={deletionPreview.counts.inventoryMovements} />
                  <PreviewItem label="Auth sessions" value={deletionPreview.counts.sessions} />
                  <PreviewItem label="WhatsApp instances" value={deletionPreview.whatsappInstances.length} />
                  <PreviewItem label="Orphan staff" value={deletionPreview.counts.orphanStaff} />
                  <PreviewItem label="Orphan technicians" value={deletionPreview.counts.orphanTechnicians} />
                  <PreviewItem label="Affiliator profiles unlinked" value={deletionPreview.counts.affiliatorProfiles} />
                  <PreviewItem label="Referral as customer" value={deletionPreview.counts.referralAsCustomer} />
                  <PreviewItem label="Customer commissions" value={deletionPreview.counts.commissionAsCustomer} />
                  <PreviewItem label="Paid commission deleted" value={formatRupiah(deletionPreview.affiliateCommissionAmount.paid)} />
                </div>
              )}

              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                This cannot be undone. Active auth sessions for deleted users are revoked. If the admin is also an affiliator, their affiliator profile is kept but unlinked and set inactive. If the admin was a referred customer, their referral and commission rows are deleted.
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-admin-confirmation">Type the admin email to confirm</Label>
                <Input
                  id="delete-admin-confirmation"
                  value={confirmationEmail}
                  onChange={(event) => setConfirmationEmail(event.target.value)}
                  placeholder={deleteTarget.email}
                  disabled={isPending}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAdmin} disabled={isPending || !canDelete}>
              {isPending ? "Deleting..." : "Delete Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreviewItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}
