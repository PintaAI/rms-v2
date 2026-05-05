import { TeknisiSparepartTable } from "@/components/dashboard/inventory/teknisi-sparepart-table";

export default async function TeknisiInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { tokoid } = await params;
  const query = await searchParams;
  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <TeknisiSparepartTable key={initialSearchQuery} tokoId={tokoid} initialSearchQuery={initialSearchQuery} />
    </div>
  );
}
