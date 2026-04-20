import { getKaryawanList, getKaryawanStats } from "@/actions/karyawan";
import { ManageKaryawan } from "@/components/dashboard/admin/manage-karyawan";
import prisma from "@/lib/prisma";
import { RiStore2Line } from "@remixicon/react";

interface AdminKaryawanPageProps {
  params: Promise<{ tokoid: string }>;
}

export default async function AdminKaryawanPage({ params }: AdminKaryawanPageProps) {
  const { tokoid } = await params;

  const toko = await prisma.toko.findUnique({
    where: { id: tokoid },
    select: { id: true, name: true, logoUrl: true },
  });

  const [karyawanResult, stats] = await Promise.all([
    getKaryawanList(tokoid),
    getKaryawanStats(tokoid),
  ]);

  if (!karyawanResult.success || !karyawanResult.data) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Karyawan</h1>
            <div className="h-6 w-1 bg-primary rounded-full" />
            <div className="flex items-center gap-2">
              {toko?.logoUrl ? (
                <img
                  src={toko.logoUrl}
                  alt={toko.name}
                  className="h-5 w-5 rounded-md object-cover"
                />
              ) : (
                <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">Kelola karyawan toko</p>
        </div>
        <p className="text-muted-foreground text-destructive">
          {karyawanResult.error || "Gagal memuat data"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Karyawan</h1>
          <div className="h-6 w-1 bg-primary rounded-full" />
          <div className="flex items-center gap-2">
            {toko?.logoUrl ? (
              <img
                src={toko.logoUrl}
                alt={toko.name}
                className="h-5 w-5 rounded-md object-cover"
              />
            ) : (
              <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola karyawan toko</p>
      </div>
      <ManageKaryawan
        initialKaryawan={karyawanResult.data}
        initialStats={stats}
        tokoId={tokoid}
      />
    </div>
  );
}