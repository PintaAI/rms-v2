import { getKaryawanList, getKaryawanStats } from "@/actions/karyawan";
import { ManageKaryawan } from "@/components/dashboard/manage-karyawan";

export default async function AdminKaryawanPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;

  const [karyawanResult, stats] = await Promise.all([
    getKaryawanList(tokoid),
    getKaryawanStats(tokoid),
  ]);

  if (!karyawanResult.success || !karyawanResult.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Karyawan</h1>
        <p className="text-muted-foreground text-destructive">
          {karyawanResult.error || "Gagal memuat data"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Karyawan</h1>
      <ManageKaryawan
        initialKaryawan={karyawanResult.data}
        initialStats={stats}
        tokoId={tokoid}
      />
    </div>
  );
}