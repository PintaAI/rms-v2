import { getSuperuserDashboard } from "@/actions/superuser";
import { getSuperuserAffiliateDashboard } from "@/actions/affiliate";
import { formatCurrency } from "@/lib/utils";
import {
  RiUserLine,
  RiTeamLine,
  RiToolsLine,
  RiStore2Line,
  RiMoneyDollarCircleLine,
  RiVipCrownLine,
  RiCalendarCheckLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiInboxLine,
} from "@remixicon/react";
import {
  OverviewStatsCard,
  OverviewMobileGroupCard,
  OverviewSectionHeader,
} from "@/components/dashboard/shared/overview-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserManagementTable } from "@/components/superuser/user-management-table";
import { AffiliateManagement } from "@/components/superuser/affiliate-management";
import { UserInfo } from "@/components/shared/user-info";
import { SubscriptionPaymentReview } from "@/components/superuser/subscription-payment-review";

export default async function SuperuserPage() {
  const [result, affiliateResult] = await Promise.all([
    getSuperuserDashboard(),
    getSuperuserAffiliateDashboard(),
  ]);

  if (!result.success || !result.data || !affiliateResult.success || !affiliateResult.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Superuser Dashboard</h1>
          <p className="text-destructive">{result.error || affiliateResult.error || "Failed to load data"}</p>
        </div>
      </div>
    );
  }

  const { stats, users, pendingPayments } = result.data;

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 lg:space-y-8">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Superuser Dashboard
              </h1>
              <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
              <Badge variant="outline" className="text-xs">
                Platform Admin
              </Badge>
            </div>
            <UserInfo />
          </div>
          <p className="text-sm text-muted-foreground/70">
            Manage all users, subscriptions, and platform statistics
          </p>
        </div>

        <section className="flex flex-col gap-3 sm:gap-4">
          <OverviewSectionHeader title="RMS Overview" colorClass="bg-primary" />
          <div className="grid gap-4 lg:grid-cols-3">
            <OverviewMobileGroupCard
              title="Users"
              variant="primary"
              items={[
                {
                  label: "Total Users",
                  value: stats.users.total,
                  icon: <RiUserLine className="size-4" />,
                  variant: "primary",
                },
                {
                  label: "Admins",
                  value: stats.users.admins,
                  icon: <RiTeamLine className="size-4" />,
                  variant: "success",
                },
                {
                  label: "Staff",
                  value: stats.users.staff,
                  icon: <RiTeamLine className="size-4" />,
                  variant: "accent",
                },
                {
                  label: "Technicians",
                  value: stats.users.technicians,
                  icon: <RiToolsLine className="size-4" />,
                  variant: "default",
                },
                {
                  label: "Superusers",
                  value: stats.users.superusers,
                  icon: <RiVipCrownLine className="size-4" />,
                  variant: "warning",
                },
              ]}
            />
            <OverviewMobileGroupCard
              title="Tokos"
              variant="accent"
              items={[
                {
                  label: "Total Tokos",
                  value: stats.tokos.total,
                  icon: <RiStore2Line className="size-4" />,
                  variant: "accent",
                },
                {
                  label: "Active",
                  value: stats.tokos.active,
                  icon: <RiStore2Line className="size-4" />,
                  variant: "success",
                },
                {
                  label: "Inactive",
                  value: stats.tokos.inactive,
                  icon: <RiStore2Line className="size-4" />,
                  variant: "warning",
                },
              ]}
            />
            <OverviewMobileGroupCard
              title="Services"
              variant="primary"
              items={[
                {
                  label: "Total Services",
                  value: stats.services.total,
                  icon: <RiInboxLine className="size-4" />,
                  variant: "primary",
                },
                {
                  label: "Last 30 Days",
                  value: stats.services.monthly,
                  icon: <RiCalendarCheckLine className="size-4" />,
                  variant: "primary",
                },
                {
                  label: "In Progress",
                  value: stats.services.byStatus.repairing,
                  icon: <RiToolsLine className="size-4" />,
                  variant: "accent",
                },
                {
                  label: "Completed",
                  value: stats.services.byStatus.done,
                  icon: <RiCheckDoubleLine className="size-4" />,
                  variant: "success",
                },
                {
                  label: "Failed",
                  value: stats.services.byStatus.failed,
                  icon: <RiCloseLine className="size-4" />,
                  variant: stats.services.byStatus.failed > 0 ? "warning" : "default",
                },
              ]}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 sm:gap-4">
          <OverviewSectionHeader title="Subscriptions" colorClass="bg-chart-1" />
          <div className="md:hidden">
            <OverviewMobileGroupCard
              title="Subscriptions"
              variant="success"
              items={[
                {
                  label: "Free",
                  value: stats.subscriptions.free,
                  icon: <RiVipCrownLine className="size-4" />,
                  variant: "default",
                },
                {
                  label: "Pro",
                  value: stats.subscriptions.premium,
                  icon: <RiVipCrownLine className="size-4" />,
                  variant: "accent",
                },
                {
                  label: "Enterprise",
                  value: stats.subscriptions.enterprise,
                  icon: <RiVipCrownLine className="size-4" />,
                  variant: "success",
                },
              ]}
            />
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-3">
            <OverviewStatsCard
              title="Free"
              value={stats.subscriptions.free}
              icon={<RiVipCrownLine className="h-4 w-4" />}
              variant="default"
            />
            <OverviewStatsCard
              title="Pro Plan"
              value={stats.subscriptions.premium}
              icon={<RiVipCrownLine className="h-4 w-4" />}
              variant="accent"
            />
            <OverviewStatsCard
              title="Enterprise Plan"
              value={stats.subscriptions.enterprise}
              icon={<RiVipCrownLine className="h-4 w-4" />}
              variant="success"
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 sm:gap-4">
          <OverviewSectionHeader title="Revenue" colorClass="bg-chart-1" />
          <div className="md:hidden">
            <OverviewMobileGroupCard
              title="Revenue"
              variant="success"
              items={[
                {
                  label: "MRR",
                  value: formatCurrency(stats.revenue.totalSubscriptionRevenue),
                  icon: <RiMoneyDollarCircleLine className="size-4" />,
                  variant: "success",
                },
                {
                  label: "New MRR 30 Days",
                  value: formatCurrency(stats.revenue.monthlyNewSubscriptionRevenue),
                  icon: <RiCalendarCheckLine className="size-4" />,
                  variant: "primary",
                },
                {
                  label: "Paid Subscribers",
                  value: stats.revenue.paidSubscribers,
                  icon: <RiVipCrownLine className="size-4" />,
                  variant: "accent",
                },
              ]}
            />
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-3">
            <OverviewStatsCard
              title="Subscription MRR"
              value={formatCurrency(stats.revenue.totalSubscriptionRevenue)}
              icon={<RiMoneyDollarCircleLine className="h-4 w-4" />}
              variant="success"
            />
            <OverviewStatsCard
              title="New MRR Last 30 Days"
              value={formatCurrency(stats.revenue.monthlyNewSubscriptionRevenue)}
              icon={<RiCalendarCheckLine className="h-4 w-4" />}
              description="new paid subscriptions"
              variant="primary"
            />
            <OverviewStatsCard
              title="Paid Subscribers"
              value={stats.revenue.paidSubscribers}
              icon={<RiVipCrownLine className="h-4 w-4" />}
              variant="accent"
            />
          </div>
        </section>

        <section>
          <Card className="overflow-hidden border-border/50 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-lg">Admin Users</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage admin roles and subscription plans
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <UserManagementTable users={users} />
            </CardContent>
          </Card>
        </section>

        <SubscriptionPaymentReview payments={pendingPayments} />

        <AffiliateManagement data={affiliateResult.data} />
      </div>
    </div>
  );
}
