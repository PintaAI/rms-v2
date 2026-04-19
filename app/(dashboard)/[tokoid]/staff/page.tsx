import { getStaffOverview } from "@/actions/overview";
import { StaffOverviewClient } from "@/components/dashboard/staff/staff-overview";

export default async function StaffOverviewPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const result = await getStaffOverview(tokoid);

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

  return <StaffOverviewClient initialData={result.data} tokoId={tokoid} />;
}