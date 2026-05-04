import { getKaryawanList, getKaryawanStats } from "@/actions/karyawan";
import { ManageKaryawan } from "@/components/dashboard/admin/manage-karyawan";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { FeaturePreview } from "@/components/dashboard/feature-preview";
import { getRequestScope, getPageFeatureCheck } from "@/lib/auth/request-scope";
import { MOCK_KARYAWAN, MOCK_KARYAWAN_STATS } from "@/lib/feature-preview-mocks";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { RiStore2Line } from "@remixicon/react";
import { redirect } from "next/navigation";

interface AdminKaryawanPageProps {
  params: Promise<{ tokoid: string }>;
}

export default async function AdminKaryawanPage({ params }: AdminKaryawanPageProps) {
  const { tokoid } = await params;
  const scope = await getRequestScope(tokoid);
  const access = getPageFeatureCheck(scope, "karyawan.management");

  if (access.reason === "role_denied") redirect("/dashboard");
  if (access.reason === "disabled_by_toko") redirect(`/${tokoid}/admin`);

  if (access.reason === "plan_required") {
    return (
      <FeaturePreview
        featureKey="karyawan.management"
        requiredPlan={access.metadata.minimumPlan}
        tokoId={tokoid}
      >
        <div className="space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">Karyawan</h1>
              <div className="h-6 w-1 bg-primary rounded-full" />
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Toko Example</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground/70">Kelola karyawan toko</p>
          </div>
          <ManageKaryawan
            initialKaryawan={MOCK_KARYAWAN}
            initialStats={MOCK_KARYAWAN_STATS}
            tokoId={tokoid}
            tokoName="Toko Example"
          />
        </div>
      </FeaturePreview>
    );
  }

  if (!access.allowed) {
    return (
      <FeatureLocked
        featureLabel={access.metadata.label}
        featureDescription={access.metadata.description}
        requiredPlan={access.metadata.minimumPlan}
        reason={access.reason ?? "plan_required"}
        tokoId={tokoid}
      />
    );
  }

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
                <Image
                  src={toko.logoUrl}
                  alt={toko.name}
                  width={20}
                  height={20}
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
              <Image
                src={toko.logoUrl}
                alt={toko.name}
                width={20}
                height={20}
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
        tokoName={toko?.name ?? "Toko"}
      />
    </div>
  );
}
