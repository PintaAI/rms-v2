import { getAdminOverview } from "@/actions/overview";
import { AdminOverviewClient } from "@/components/dashboard/admin-overview";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const result = await getAdminOverview(tokoid);

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

  return <AdminOverviewClient initialData={result.data} tokoId={tokoid} />;
}