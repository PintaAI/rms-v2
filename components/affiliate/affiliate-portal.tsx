import type { AffiliatePortalData } from "@/actions/affiliate";
import { AffiliateGrantTrialButton } from "@/components/affiliate/affiliate-grant-trial-button";
import { AffiliateCopyLinkButton } from "@/components/affiliate/affiliate-copy-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { RiBookOpenLine } from "@remixicon/react";
import Link from "next/link";

export function AffiliatePortal({ data, token }: { data: AffiliatePortalData; token: string }) {
  const knowledgeHref = `/affiliate/portal/${encodeURIComponent(data.affiliator.code)}/knowledge?token=${encodeURIComponent(token)}`;
  return (
    <main className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Affiliate Portal</p>
            <h1 className="text-3xl font-black tracking-tight">{data.affiliator.name}</h1>
          </div>
          <Badge variant={data.affiliator.status === "active" ? "default" : "secondary"}>{data.affiliator.status}</Badge>
        </header>

        {data.affiliator.status === "inactive" ? (
          <Card className="border-destructive/30">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Akun affiliate ini sedang tidak aktif. Data historis tetap dapat dilihat, tetapi referral baru tidak akan dihitung.
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <RiBookOpenLine className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">Product Knowledge</h3>
                <p className="text-sm text-muted-foreground">Pelajari fitur, paket harga, dan strategi promosi RMS agar Anda bisa memasarkan dengan percaya diri.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href={knowledgeHref}>Buka Product Knowledge</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Referral Link</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="break-all font-mono text-sm">{data.links.referralLink}</p>
              <p className="mt-2 text-sm text-muted-foreground">Bagikan referral link untuk mengajak pengguna baru. Tracking link ini bersifat pribadi dan hanya untuk melihat performa serta komisi Anda.</p>
            </div>
            <AffiliateCopyLinkButton value={data.links.referralLink} />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <PortalStat title="Referral" value={data.stats.totalReferrals} />
          <PortalStat title="Konversi paid" value={data.stats.paidConversions} />
          <PortalStat title="Conversion rate" value={`${data.stats.conversionRate}%`} />
          <PortalStat title="Commission paid" value={formatCurrency(data.stats.paidAmount)} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <PortalStat title="Pending" value={formatCurrency(data.stats.pendingAmount)} />
          <PortalStat title="Approved" value={formatCurrency(data.stats.approvedAmount)} />
          <PortalStat title="Rejected" value={formatCurrency(data.stats.rejectedAmount)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>History Commission</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sistem commission saat ini: bonus registrasi, Pro monthly 10%, dan Enterprise one-time 10%.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.commissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada commission.</TableCell>
                    </TableRow>
                  ) : data.commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>{commission.customer}</TableCell>
                      <TableCell>{commissionKindLabel(commission.type)}</TableCell>
                      <TableCell>{planLabel(commission.plan)}</TableCell>
                      <TableCell>{formatCurrency(commission.amount)}</TableCell>
                      <TableCell><Badge variant="outline">{commission.status}</Badge></TableCell>
                      <TableCell>{new Date(commission.createdAt).toLocaleDateString("id-ID")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>History Referral</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Join</TableHead>
                    <TableHead>Konversi</TableHead>
                    <TableHead>Trial Pro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.referrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada referral.</TableCell>
                    </TableRow>
                  ) : data.referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>{referral.customer}</TableCell>
                      <TableCell>{new Date(referral.joinedAt).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell>{referral.convertedAt ? new Date(referral.convertedAt).toLocaleDateString("id-ID") : "Belum"}</TableCell>
                      <TableCell>
                        <AffiliateGrantTrialButton
                          code={data.affiliator.code}
                          token={token}
                          referralId={referral.id}
                          canGrantProTrial={referral.canGrantProTrial}
                          subscriptionStatus={referral.subscriptionStatus}
                          trialEndsAt={referral.trialEndsAt?.toISOString() ?? null}
                          proTrialStartedAt={referral.proTrialStartedAt?.toISOString() ?? null}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">Detail customer disamarkan untuk privacy. Hubungi support RMS jika ada data payout yang perlu dikoreksi.</p>
      </div>
    </main>
  );
}

function commissionKindLabel(kind: AffiliatePortalData["commissions"][number]["type"]) {
  if (kind === "registration_bonus") return "Bonus registrasi";
  if (kind === "pro_recurring") return "Pro monthly";
  return "Enterprise one-time";
}

function planLabel(plan: AffiliatePortalData["commissions"][number]["plan"]) {
  if (plan === "free") return "Registrasi";
  if (plan === "premium") return "Pro";
  return "Enterprise";
}

function PortalStat({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}
