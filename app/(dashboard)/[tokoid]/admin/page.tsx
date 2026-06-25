import { getAdminOverview } from "@/actions/overview";
import { getTokoHeader } from "@/actions/toko";
import { AdminOverview } from "@/components/dashboard/admin/admin-overview";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const [result, toko] = await Promise.all([
    getAdminOverview(tokoid),
    getTokoHeader(tokoid),
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

  const currentToko = toko.success ? toko.data ?? undefined : undefined;

  return <AdminOverview data={result.data} tokoId={tokoid} currentToko={currentToko} />;
}
