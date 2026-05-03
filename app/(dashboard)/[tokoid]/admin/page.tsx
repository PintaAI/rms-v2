import { getAdminOverview } from "@/actions/overview";
import { getAuthProviderData } from "@/actions/user";
import { AdminOverview } from "@/components/dashboard/admin/admin-overview";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const [result, { tokoList }] = await Promise.all([
    getAdminOverview(tokoid),
    getAuthProviderData(),
  ]);

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-muted-foreground text-destructive">
          {result.error || "Gagal memuat data"}
        </p>
      </div>
    );
  }

  const currentToko = tokoList.find((toko) => toko.id === tokoid);

  return <AdminOverview data={result.data} tokoId={tokoid} currentToko={currentToko} />;
}
