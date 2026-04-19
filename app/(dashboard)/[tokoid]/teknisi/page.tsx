import { getTechnicianDashboard } from "@/actions/service";
import { TeknisiOverview } from "@/components/dashboard/teknisi-overview";

export default async function TeknisiOverviewPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const result = await getTechnicianDashboard();

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Teknisi Overview</h1>
        <p className="text-muted-foreground text-destructive">
          {result.error || "Gagal memuat data"}
        </p>
      </div>
    );
  }

  return (
    <TeknisiOverview
      stats={result.data.stats}
      availableServices={result.data.availableServices}
      myTasks={result.data.myTasks}
      tokoId={tokoid}
    />
  );
}