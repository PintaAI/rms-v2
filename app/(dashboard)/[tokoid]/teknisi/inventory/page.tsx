import { TeknisiSparepartTable } from "@/components/dashboard/teknisi-sparepart-table";

export default async function TeknisiInventoryPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <TeknisiSparepartTable tokoId={tokoid} />
    </div>
  );
}