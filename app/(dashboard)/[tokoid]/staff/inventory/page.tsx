import { StaffSparepartTable } from "@/components/dashboard/staff-sparepart-table";

export default async function StaffInventoryPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sparepart</h1>
      <StaffSparepartTable tokoId={tokoid} />
    </div>
  );
}