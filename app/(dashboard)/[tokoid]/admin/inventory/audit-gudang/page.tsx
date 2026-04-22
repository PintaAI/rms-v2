import { AuditGudangMock } from "@/components/dashboard/inventory/audit-gudang-mock";

export default async function AuditGudangPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Audit Gudang</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
        </div>
        <p className="text-sm text-muted-foreground/70">
          Mock UI audit stok fisik untuk membantu admin memeriksa kesesuaian inventory gudang.
        </p>
      </div>

      <AuditGudangMock tokoId={tokoid} />
    </div>
  );
}
