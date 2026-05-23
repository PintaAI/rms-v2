"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createExternalAffiliator,
  createUserAffiliator,
  deleteAffiliator,
  regenerateAffiliatorPortalToken,
  rejectAndUnlinkReferral,
  updateAffiliateCommissionStatus,
  updateAffiliator,
  updateAffiliatorStatus,
  updateReferralRegistrationCommission,
  type AffiliateCommissionRow,
  type AffiliateDashboardData,
  type AffiliatorRow,
} from "@/actions/affiliate";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { RiDeleteBinLine, RiEditLine, RiFileCopyLine, RiLink, RiRefreshLine } from "@remixicon/react";

interface AffiliateManagementProps {
  data: AffiliateDashboardData;
}

const emptyExternalForm = {
  name: "",
  email: "",
  phone: "",
  premiumCommissionValue: "10",
  enterpriseCommissionValue: "10",
  payoutInfo: "",
  notes: "",
};

const emptyEditForm = {
  ...emptyExternalForm,
  status: "active" as "active" | "inactive",
};

export function AffiliateManagement({ data }: AffiliateManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [externalOpen, setExternalOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AffiliatorRow | null>(null);
  const [externalForm, setExternalForm] = useState(emptyExternalForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [linkUserId, setLinkUserId] = useState("");
  const [referralAmounts, setReferralAmounts] = useState<Record<string, string>>(() => Object.fromEntries(
    data.referrals.map((referral) => [referral.id, String(referral.registrationCommissionAmount)])
  ));

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const submitExternal = () => {
    startTransition(async () => {
      const result = await createExternalAffiliator({
        ...externalForm,
        premiumCommissionValue: Number(externalForm.premiumCommissionValue),
        enterpriseCommissionValue: Number(externalForm.enterpriseCommissionValue),
      });
      if (!result.success) {
        toast.error(result.error || "Failed to create affiliator");
        return;
      }
      toast.success("Affiliator created");
      setExternalForm(emptyExternalForm);
      setExternalOpen(false);
    });
  };

  const submitUserLink = () => {
    startTransition(async () => {
      const result = await createUserAffiliator({ userId: linkUserId });
      if (!result.success) {
        toast.error(result.error || "Failed to link user");
        return;
      }
      toast.success("User linked as affiliator");
      setLinkUserId("");
      setLinkOpen(false);
    });
  };

  const openEdit = (row: AffiliatorRow) => {
    setEditingRow(row);
    setEditForm({
      name: row.name,
      email: row.email ?? "",
      phone: row.phone ?? "",
      premiumCommissionValue: String(row.premiumCommissionValue),
      enterpriseCommissionValue: String(row.enterpriseCommissionValue),
      payoutInfo: row.payoutInfo,
      notes: row.notes ?? "",
      status: row.status,
    });
  };

  const submitEdit = () => {
    if (!editingRow) return;

    startTransition(async () => {
      const result = await updateAffiliator({
        id: editingRow.id,
        ...editForm,
        premiumCommissionValue: Number(editForm.premiumCommissionValue),
        enterpriseCommissionValue: Number(editForm.enterpriseCommissionValue),
      });
      if (!result.success) {
        toast.error(result.error || "Failed to update affiliator");
        return;
      }
      toast.success("Affiliator updated");
      setEditingRow(null);
      setEditForm(emptyEditForm);
    });
  };

  const removeAffiliator = (row: AffiliatorRow) => {
    if (!window.confirm(`Delete ${row.name}? Affiliators with referrals or commissions will be blocked.`)) return;

    startTransition(async () => {
      const result = await deleteAffiliator(row.id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete affiliator");
        return;
      }
      toast.success("Affiliator deleted");
    });
  };

  const changeStatus = (row: AffiliatorRow, status: "active" | "inactive") => {
    startTransition(async () => {
      const result = await updateAffiliatorStatus(row.id, status);
      if (!result.success) {
        toast.error(result.error || "Failed to update status");
        return;
      }
      toast.success("Affiliator status updated");
    });
  };

  const regenerateToken = (row: AffiliatorRow) => {
    startTransition(async () => {
      const result = await regenerateAffiliatorPortalToken(row.id);
      if (!result.success) {
        toast.error(result.error || "Failed to regenerate token");
        return;
      }
      toast.success("Portal token regenerated");
    });
  };

  const updateCommission = (commission: AffiliateCommissionRow, status: "pending" | "approved" | "paid" | "rejected") => {
    startTransition(async () => {
      const result = await updateAffiliateCommissionStatus({ commissionId: commission.id, status });
      if (!result.success) {
        toast.error(result.error || "Failed to update commission");
        return;
      }
      toast.success("Commission updated");
    });
  };

  const saveReferralAmount = (referralId: string) => {
    startTransition(async () => {
      const result = await updateReferralRegistrationCommission({
        referralId,
        amount: Number(referralAmounts[referralId] ?? 0),
      });
      if (!result.success) {
        toast.error(result.error || "Failed to update referral commission");
        return;
      }
      toast.success("Registration commission updated");
    });
  };

  const unlinkReferral = (referral: AffiliateDashboardData["referrals"][number]) => {
    if (!window.confirm(`Reject and unlink ${referral.customerName} from ${referral.affiliatorName}? Unpaid affiliate commissions for this referral will be removed.`)) return;

    startTransition(async () => {
      const result = await rejectAndUnlinkReferral(referral.id);
      if (!result.success) {
        toast.error(result.error || "Failed to unlink referral");
        return;
      }
      toast.success("Referral rejected and unlinked");
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Affiliate Program</h2>
          <p className="text-sm text-muted-foreground">Manage affiliators, referral links, tracking links, and payout status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={externalOpen} onOpenChange={setExternalOpen}>
            <DialogTrigger asChild>
              <Button>Create External</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create external affiliator</DialogTitle>
                <DialogDescription>Add a promoter who does not need an RMS login.</DialogDescription>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="affiliate-name">Name</FieldLabel>
                  <FieldContent><Input id="affiliate-name" value={externalForm.name} onChange={(event) => setExternalForm({ ...externalForm, name: event.target.value })} /></FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="affiliate-email">Email</FieldLabel>
                  <FieldContent><Input id="affiliate-email" value={externalForm.email} onChange={(event) => setExternalForm({ ...externalForm, email: event.target.value })} /></FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="affiliate-phone">Phone</FieldLabel>
                  <FieldContent><Input id="affiliate-phone" value={externalForm.phone} onChange={(event) => setExternalForm({ ...externalForm, phone: event.target.value })} /></FieldContent>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="premium-commission">Pro monthly %</FieldLabel>
                    <FieldContent><Input id="premium-commission" inputMode="numeric" value={externalForm.premiumCommissionValue} onChange={(event) => setExternalForm({ ...externalForm, premiumCommissionValue: event.target.value })} /></FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="enterprise-commission">Enterprise one-time %</FieldLabel>
                    <FieldContent><Input id="enterprise-commission" inputMode="numeric" value={externalForm.enterpriseCommissionValue} onChange={(event) => setExternalForm({ ...externalForm, enterpriseCommissionValue: event.target.value })} /></FieldContent>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="payout-info">Payout info</FieldLabel>
                  <FieldContent><Textarea id="payout-info" value={externalForm.payoutInfo} onChange={(event) => setExternalForm({ ...externalForm, payoutInfo: event.target.value })} /></FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="affiliate-notes">Notes</FieldLabel>
                  <FieldContent><Textarea id="affiliate-notes" value={externalForm.notes} onChange={(event) => setExternalForm({ ...externalForm, notes: event.target.value })} /></FieldContent>
                </Field>
              </FieldGroup>
              <Button onClick={submitExternal} disabled={isPending}>Create affiliator</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Link RMS User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link RMS user</DialogTitle>
                <DialogDescription>Only admin users can be linked as affiliators.</DialogDescription>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel>Select user</FieldLabel>
                  <FieldContent>
                    <Select value={linkUserId} onValueChange={setLinkUserId}>
                      <SelectTrigger><SelectValue placeholder="Choose admin user" /></SelectTrigger>
                      <SelectContent>
                        {data.linkableUsers.map((user) => <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
              </FieldGroup>
              <Button onClick={submitUserLink} disabled={isPending || !linkUserId}>Link user</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={Boolean(editingRow)} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-2xl sm:min-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit affiliator</DialogTitle>
            <DialogDescription>Update contact, payout, commission, and status details.</DialogDescription>
          </DialogHeader>
          <AffiliatorForm form={editForm} onChange={setEditForm} includeStatus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={submitEdit} disabled={isPending}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-4">
        <AffiliateStatCard title="Affiliators" value={data.stats.totalAffiliators} detail={`${data.stats.activeAffiliators} active`} />
        <AffiliateStatCard title="Referrals" value={data.stats.totalReferrals} detail={`${data.stats.paidConversions} converted`} />
        <AffiliateStatCard title="Pending" value={formatCurrency(data.stats.pendingCommissionAmount)} detail="awaiting review" />
        <AffiliateStatCard title="Paid" value={formatCurrency(data.stats.paidCommissionAmount)} detail="completed payout" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Affiliator Roster</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.affiliators.map((row) => {
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.type === "user" ? "RMS user" : "External"} · {row.email || row.phone || "No contact"}</div>
                      </TableCell>
                      <TableCell><Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge></TableCell>
                      <TableCell>{row.referralCount}</TableCell>
                      <TableCell>{formatCurrency(row.pendingCommissionAmount)}</TableCell>
                      <TableCell>{formatCurrency(row.paidCommissionAmount)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyText(row.links.referralLink, "Referral link")}><RiLink data-icon="inline-start" />Referral</Button>
                          <Button size="sm" variant="outline" onClick={() => copyText(row.links.trackingLink, "Tracking link")}><RiFileCopyLine data-icon="inline-start" />Tracking</Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select value={row.status} disabled={isPending} onValueChange={(value) => changeStatus(row, value as "active" | "inactive")}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" onClick={() => openEdit(row)} disabled={isPending}><RiEditLine data-icon="inline-start" />Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => regenerateToken(row)} disabled={isPending}><RiRefreshLine data-icon="inline-start" />Token</Button>
                          <Button size="sm" variant="ghost" onClick={() => removeAffiliator(row)} disabled={isPending}><RiDeleteBinLine data-icon="inline-start" />Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Commission Lifecycle</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliator</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>{commission.affiliatorName}</TableCell>
                    <TableCell><div>{commission.customerName}</div><div className="text-xs text-muted-foreground">{commission.customerEmail}</div></TableCell>
                    <TableCell>{commissionKindLabel(commission.type)}</TableCell>
                    <TableCell className="capitalize">{commission.plan}</TableCell>
                    <TableCell>{commission.commissionBaseAmount ? formatCurrency(commission.commissionBaseAmount) : "-"}</TableCell>
                    <TableCell>{formatCurrency(commission.amount)}</TableCell>
                    <TableCell><Badge variant="outline">{commission.status}</Badge></TableCell>
                    <TableCell>{new Date(commission.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={isPending || commission.status !== "pending"} onClick={() => updateCommission(commission, "approved")}>Approve</Button>
                        <Button size="sm" variant="outline" disabled={isPending || commission.status !== "approved"} onClick={() => updateCommission(commission, "paid")}>Paid</Button>
                        {commission.status === "rejected" ? (
                          <Button size="sm" variant="outline" disabled={isPending} onClick={() => updateCommission(commission, "pending")}>Re-open</Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled={isPending || commission.status === "paid"} onClick={() => updateCommission(commission, "rejected")}>Reject</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Referral Registration Bonus</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliator</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>{referral.affiliatorName}</TableCell>
                    <TableCell><div>{referral.customerName}</div><div className="text-xs text-muted-foreground">{referral.customerEmail}</div></TableCell>
                    <TableCell>{new Date(referral.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Input
                        className="w-36"
                        inputMode="numeric"
                        value={referralAmounts[referral.id] ?? String(referral.registrationCommissionAmount)}
                        onChange={(event) => setReferralAmounts({ ...referralAmounts, [referral.id]: event.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => saveReferralAmount(referral.id)}>Save</Button>
                        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => unlinkReferral(referral)}>Reject & Unlink</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function AffiliatorForm({
  form,
  onChange,
  includeStatus = false,
}: {
  form: typeof emptyEditForm;
  onChange: (form: typeof emptyEditForm) => void;
  includeStatus?: boolean;
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="edit-affiliate-name">Name</FieldLabel>
        <FieldContent><Input id="edit-affiliate-name" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} /></FieldContent>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="edit-affiliate-email">Email</FieldLabel>
          <FieldContent><Input id="edit-affiliate-email" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} /></FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-affiliate-phone">Phone</FieldLabel>
          <FieldContent><Input id="edit-affiliate-phone" value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} /></FieldContent>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="edit-premium-commission">Pro monthly %</FieldLabel>
          <FieldContent><Input id="edit-premium-commission" inputMode="numeric" value={form.premiumCommissionValue} onChange={(event) => onChange({ ...form, premiumCommissionValue: event.target.value })} /></FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-enterprise-commission">Enterprise one-time %</FieldLabel>
          <FieldContent><Input id="edit-enterprise-commission" inputMode="numeric" value={form.enterpriseCommissionValue} onChange={(event) => onChange({ ...form, enterpriseCommissionValue: event.target.value })} /></FieldContent>
        </Field>
      </div>
      {includeStatus ? (
        <Field>
          <FieldLabel>Status</FieldLabel>
          <FieldContent>
            <Select value={form.status} onValueChange={(value) => onChange({ ...form, status: value as "active" | "inactive" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </FieldContent>
        </Field>
      ) : null}
      <Field>
        <FieldLabel htmlFor="edit-payout-info">Payout info</FieldLabel>
        <FieldContent><Textarea id="edit-payout-info" value={form.payoutInfo} onChange={(event) => onChange({ ...form, payoutInfo: event.target.value })} /></FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="edit-affiliate-notes">Notes</FieldLabel>
        <FieldContent><Textarea id="edit-affiliate-notes" value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} /></FieldContent>
      </Field>
    </FieldGroup>
  );
}

function commissionKindLabel(kind: AffiliateCommissionRow["type"]) {
  if (kind === "registration_bonus") return "Registration";
  if (kind === "pro_recurring") return "Pro monthly";
  return "Enterprise one-time";
}

function AffiliateStatCard({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
