import { getStaffOverview } from "@/actions/overview";
import { getUserTokoList } from "@/actions/user";
import { StaffOverview } from "@/components/dashboard/staff/staff-overview";

export default async function StaffOverviewPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;
  const [result, tokoList] = await Promise.all([
    getStaffOverview(tokoid),
    getUserTokoList(),
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

  return <StaffOverview data={result.data} tokoId={tokoid} currentToko={currentToko} />;
}
