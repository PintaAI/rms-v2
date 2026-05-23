"use client";

import * as React from "react";
import { toast } from "sonner";
import { getCurrentUserAffiliateDashboard, type AffiliatePortalData } from "@/actions/affiliate";
import { DEFAULT_ENTERPRISE_COMMISSION_PERCENT, DEFAULT_PRO_RECURRING_COMMISSION_PERCENT, DEFAULT_REGISTER_COMMISSION } from "@/lib/affiliate";
import { formatCurrency } from "@/lib/utils";
import { AffiliateStatCard } from "@/components/affiliate/affiliate-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RMS_WHATSAPP_NUMBER } from "@/components/settings/helpers";
import { RiFileCopyLine, RiWhatsappLine } from "@remixicon/react";

export function AffiliateSettings() {
  const [data, setData] = React.useState<AffiliatePortalData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    async function loadAffiliateDashboard() {
      setIsLoading(true);
      const result = await getCurrentUserAffiliateDashboard();
      if (!active) return;

      if (!result.success) {
        toast.error(result.error || "Gagal memuat data affiliate");
        setData(null);
        setIsLoading(false);
        return;
      }

      setData(result.data ?? null);
      setIsLoading(false);
    }

    void loadAffiliateDashboard();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <AffiliateCta />;
  }

  return <AffiliateDashboard data={data} />;
}

function AffiliateCta() {
  const contactUrl = `https://wa.me/${RMS_WHATSAPP_NUMBER}?text=Saya%20tertarik%20menjadi%20affiliator%20RMS`;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Jadi Affiliator RMS</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            Ajak teman atau partner bisnis menggunakan RMS. Dapatkan potongan diskon bulanan atau passive income dari setiap referral yang upgrade ke paket berbayar.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Komisi Registrasi</div>
              <div className="mt-1 text-lg font-bold text-foreground">{formatCurrency(DEFAULT_REGISTER_COMMISSION)}</div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Pro / Enterprise</div>
              <div className="mt-1 text-lg font-bold text-foreground">{DEFAULT_PRO_RECURRING_COMMISSION_PERCENT}% / {DEFAULT_ENTERPRISE_COMMISSION_PERCENT}%</div>
            </div>
          </div>
          <Button asChild className="w-fit">
            <a href={contactUrl} target="_blank" rel="noreferrer">
              <RiWhatsappLine data-icon="inline-start" />
              Ajukan Jadi Affiliator
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AffiliateDashboard({ data }: { data: AffiliatePortalData }) {
  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(data.links.referralLink);
    toast.success("Referral link copied");
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Affiliate Dashboard</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{data.affiliator.name}</p>
          </div>
          <Badge variant={data.affiliator.status === "active" ? "default" : "secondary"}>{data.affiliator.status}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Referral link</div>
            <div className="mt-1 break-all font-mono text-xs">{data.links.referralLink}</div>
          </div>
          <Button variant="outline" className="w-fit" onClick={copyReferralLink}>
            <RiFileCopyLine data-icon="inline-start" />
            Copy referral link
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <AffiliateStatCard title="Referral" value={data.stats.totalReferrals} size="sm" />
        <AffiliateStatCard title="Konversi" value={data.stats.paidConversions} size="sm" />
        <AffiliateStatCard title="Conversion Rate" value={`${data.stats.conversionRate}%`} size="sm" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AffiliateStatCard title="Pending" value={formatCurrency(data.stats.pendingAmount)} size="sm" />
        <AffiliateStatCard title="Approved" value={formatCurrency(data.stats.approvedAmount)} size="sm" />
        <AffiliateStatCard title="Paid" value={formatCurrency(data.stats.paidAmount)} size="sm" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada komisi.</TableCell>
                  </TableRow>
                ) : data.commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>{commission.customer}</TableCell>
                    <TableCell className="capitalize">{commission.plan}</TableCell>
                    <TableCell>{formatCurrency(commission.amount)}</TableCell>
                    <TableCell><Badge variant="outline">{commission.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Converted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.referrals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">Belum ada referral.</TableCell>
                  </TableRow>
                ) : data.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>{referral.customer}</TableCell>
                    <TableCell>{new Date(referral.joinedAt).toLocaleDateString()}</TableCell>
                    <TableCell>{referral.convertedAt ? new Date(referral.convertedAt).toLocaleDateString() : "Belum"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


