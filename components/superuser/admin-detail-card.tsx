import type { SuperuserUserRow } from "@/actions/superuser";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface AdminDetailCardProps {
  admin: SuperuserUserRow;
}

export function AdminDetailCard({ admin }: AdminDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>{admin.name}</CardTitle>
            <CardDescription>{admin.email}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={planVariant(admin.plan)}>{planLabel(admin.plan)}</Badge>
            <Badge variant={statusVariant(admin.subscriptionStatus)}>{admin.subscriptionStatus ?? "no subscription"}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailMetric label="Toko" value={admin.tokoCount} />
          <DetailMetric label="Staff" value={admin.staffCount} />
          <DetailMetric label="Teknisi" value={admin.technicianCount} />
          <DetailMetric label="Total servis" value={admin.serviceCount} />
          <DetailMetric label="Servis 30 hari" value={admin.monthlyServiceCount} />
          <DetailMetric label="Revenue 30 hari" value={formatRupiah(admin.monthlyRevenue)} />
          <DetailMetric label="Revenue all time" value={formatRupiah(admin.totalRevenue)} />
          <DetailMetric label="Aktivitas terakhir" value={admin.lastActivity ? formatDate(admin.lastActivity) : "Never"} />
        </div>

        <Separator />

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
            <div className="font-medium">Subscription</div>
            <DetailLine label="Plan" value={planLabel(admin.plan)} />
            <DetailLine label="Status" value={admin.subscriptionStatus ?? "-"} />
            <DetailLine label="Monthly price" value={admin.estimatedMonthlyPrice !== null ? formatRupiah(admin.estimatedMonthlyPrice) : "Custom"} />
            <DetailLine label="Pricing mode" value={admin.monthlyPriceOverride !== null ? "Custom" : "Default"} />
            <DetailLine label="Active until" value={admin.currentPeriodEnd ? formatDate(admin.currentPeriodEnd) : "-"} />
            <DetailLine label="Trial ends" value={admin.trialEndsAt ? formatDate(admin.trialEndsAt) : "-"} />
            <DetailLine label="Pro trial" value={admin.proTrialStartedAt ? "Used" : "Not used"} />
            <DetailLine label="Joined" value={formatDate(admin.createdAt)} />
          </div>

          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
            <div className="font-medium">Toko owned</div>
            {admin.tokoSummaries.length > 0 ? (
              <div className="flex flex-col gap-2">
                {admin.tokoSummaries.map((toko) => (
                  <div key={toko.id} className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2">
                    <span className="truncate font-medium">{toko.name}</span>
                    <Badge variant={toko.status === "active" ? "success" : "outline"}>{toko.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-background p-3 text-muted-foreground">
                Admin ini belum memiliki toko.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function planLabel(plan: SuperuserUserRow["plan"]) {
  if (plan === "premium") return "Pro";
  if (plan === "enterprise") return "Enterprise";
  return "Free";
}

function planVariant(plan: SuperuserUserRow["plan"]): "success" | "accent" | "outline" {
  if (plan === "premium") return "success";
  if (plan === "enterprise") return "accent";
  return "outline";
}

function statusVariant(status: string | null): "success" | "warning" | "outline" {
  if (status === "active" || status === "trialing") return "success";
  if (status === "past_due") return "warning";
  return "outline";
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("id-ID");
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}
