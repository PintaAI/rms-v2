import { getSuperuserDashboard, getSuperuserDeviceCatalog } from "@/actions/superuser";
import { getSuperuserAffiliateDashboard } from "@/actions/affiliate";
import { Badge } from "@/components/ui/badge";
import { UserInfo } from "@/components/shared/user-info";
import { SuperuserTabs } from "@/components/superuser/superuser-tabs";

export default async function SuperuserPage() {
  const [result, affiliateResult, catalogResult] = await Promise.all([
    getSuperuserDashboard(),
    getSuperuserAffiliateDashboard(),
    getSuperuserDeviceCatalog(),
  ]);

  if (!result.success || !result.data || !affiliateResult.success || !affiliateResult.data || !catalogResult.success || !catalogResult.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Superuser Dashboard</h1>
          <p className="text-destructive">{result.error || affiliateResult.error || catalogResult.error || "Failed to load data"}</p>
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

        <SuperuserTabs
          stats={stats}
          users={users}
          pendingPayments={pendingPayments}
          affiliateData={affiliateResult.data}
          catalogData={catalogResult.data}
        />
      </div>
    </div>
  );
}
