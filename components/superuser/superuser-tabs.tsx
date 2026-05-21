"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RiDashboardLine,
  RiTeamLine,
  RiMoneyDollarCircleLine,
  RiLinksLine,
  RiUserLine,
  RiToolsLine,
  RiStore2Line,
  RiVipCrownLine,
  RiCalendarCheckLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiInboxLine,
  RiWhatsappLine,
  RiSmartphoneLine,
} from "@remixicon/react";
import {
  OverviewStatsCard,
  OverviewMobileGroupCard,
  OverviewSectionHeader,
} from "@/components/dashboard/shared/overview-cards";
import { UserManagementTable } from "@/components/superuser/user-management-table";
import { SubscriptionPaymentReview } from "@/components/superuser/subscription-payment-review";
import { AffiliateManagement } from "@/components/superuser/affiliate-management";
import { WhatsappManagement } from "@/components/superuser/whatsapp-management";
import { DeviceCatalogManagement } from "@/components/superuser/device-catalog-management";
import { formatCurrency } from "@/lib/utils";
import type { SuperuserDashboardStats, SuperuserUserRow, PendingSubscriptionPaymentRow, SuperuserDeviceCatalogData } from "@/actions/superuser";
import type { AffiliateDashboardData } from "@/actions/affiliate";

interface SuperuserTabsProps {
  stats: SuperuserDashboardStats;
  users: SuperuserUserRow[];
  pendingPayments: PendingSubscriptionPaymentRow[];
  affiliateData: AffiliateDashboardData;
  catalogData: SuperuserDeviceCatalogData;
}

export function SuperuserTabs({ stats, users, pendingPayments, affiliateData, catalogData }: SuperuserTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList variant="line" className="mb-4 w-full justify-start overflow-x-auto px-1">
        <TabsTrigger value="overview"><RiDashboardLine data-icon="inline-start" />Overview</TabsTrigger>
        <TabsTrigger value="users"><RiTeamLine data-icon="inline-start" />Users</TabsTrigger>
        <TabsTrigger value="payments"><RiMoneyDollarCircleLine data-icon="inline-start" />Payments</TabsTrigger>
        <TabsTrigger value="affiliate"><RiLinksLine data-icon="inline-start" />Affiliate</TabsTrigger>
        <TabsTrigger value="catalog"><RiSmartphoneLine data-icon="inline-start" />HP Katalog</TabsTrigger>
        <TabsTrigger value="whatsapp"><RiWhatsappLine data-icon="inline-start" />WhatsApp</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="space-y-6 lg:space-y-8">
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
        </div>
      </TabsContent>

      <TabsContent value="users">
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
      </TabsContent>

      <TabsContent value="payments">
        <SubscriptionPaymentReview payments={pendingPayments} />
      </TabsContent>

      <TabsContent value="affiliate">
        <AffiliateManagement data={affiliateData} />
      </TabsContent>

      <TabsContent value="catalog">
        <DeviceCatalogManagement data={catalogData} />
      </TabsContent>

      <TabsContent value="whatsapp">
        <WhatsappManagement />
      </TabsContent>
    </Tabs>
  );
}
