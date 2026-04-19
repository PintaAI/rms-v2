import { InventoryTabs } from "@/components/dashboard/inventory/inventory-tabs";

export default async function AdminInventoryPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <InventoryTabs tokoId={tokoid} readOnly={false} />
    </div>
  );
}