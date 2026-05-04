import type { AffiliatePortalData } from "@/actions/affiliate";
import { AffiliateCopyLinkButton } from "@/components/affiliate/affiliate-copy-link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export function AffiliatePortal({ data }: { data: AffiliatePortalData }) {
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
          <PortalStat title="Referrals" value={data.stats.totalReferrals} />
          <PortalStat title="Paid conversions" value={data.stats.paidConversions} />
          <PortalStat title="Conversion rate" value={`${data.stats.conversionRate}%`} />
          <PortalStat title="Paid earnings" value={formatCurrency(data.stats.paidAmount)} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <PortalStat title="Pending" value={formatCurrency(data.stats.pendingAmount)} />
          <PortalStat title="Approved" value={formatCurrency(data.stats.approvedAmount)} />
          <PortalStat title="Rejected" value={formatCurrency(data.stats.rejectedAmount)} />
        </div>

        <Card>
          <CardHeader><CardTitle>Commission History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Plan</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>{commission.customer}</TableCell>
                      <TableCell className="capitalize">{commission.plan}</TableCell>
                      <TableCell>{formatCurrency(commission.amount)}</TableCell>
                      <TableCell><Badge variant="outline">{commission.status}</Badge></TableCell>
                      <TableCell>{new Date(commission.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Referral History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Joined</TableHead><TableHead>Converted</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>{referral.customer}</TableCell>
                      <TableCell>{new Date(referral.joinedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{referral.convertedAt ? new Date(referral.convertedAt).toLocaleDateString() : "Not yet"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">Customer details are masked for privacy. Contact RMS support if payout data needs correction.</p>
      </div>
    </main>
  );
}

function PortalStat({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}
