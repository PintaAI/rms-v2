"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteAdminAccountCascade,
  getAdminDeletionPreview,
  grantUserProTrial,
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
import { RiAlertLine, RiDeleteBinLine } from "@remixicon/react";

interface UserManagementTableProps {
  users: SuperuserUserRow[];
}

export function UserManagementTable({ users }: UserManagementTableProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<SuperuserUserRow | null>(null);
  const [deletionPreview, setDeletionPreview] = useState<AdminDeletionPreview | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [deletedUserIds, setDeletedUserIds] = useState<Set<string>>(() => new Set());

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
              <TableRow key={user.id} className="border-border/30">
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
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
                <TableCell className="text-muted-foreground">
                  {user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString("id-ID") : "-"}
                </TableCell>
                <TableCell>
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
                <TableCell>{user.tokoCount}</TableCell>
                <TableCell>{user.staffCount}</TableCell>
                <TableCell>{user.technicianCount}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={isPending} onClick={() => handleOpenDelete(user)}>
                    <RiDeleteBinLine data-icon="inline-start" />
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
                  <PreviewItem label="Spareparts" value={deletionPreview.counts.spareparts} />
                  <PreviewItem label="Retail sales" value={deletionPreview.counts.retailSales} />
                  <PreviewItem label="Warranty claims" value={deletionPreview.counts.warrantyClaims} />
                  <PreviewItem label="Supplier returns" value={deletionPreview.counts.supplierReturns} />
                  <PreviewItem label="Inventory audits" value={deletionPreview.counts.inventoryAuditSessions} />
                  <PreviewItem label="Stock movements" value={deletionPreview.counts.stockMovements} />
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
