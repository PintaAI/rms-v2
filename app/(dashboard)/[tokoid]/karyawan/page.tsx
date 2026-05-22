import { getKaryawanList, getKaryawanStats } from "@/actions/karyawan";
import { ManageKaryawan } from "@/components/dashboard/admin/manage-karyawan";
import { FeatureLocked } from "@/components/dashboard/feature-locked";
import { FeaturePreview } from "@/components/dashboard/feature-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can, getPageFeatureCheck, getPermissionLockReason, getRequestScope } from "@/lib/auth/request-scope";
import { MOCK_KARYAWAN, MOCK_KARYAWAN_STATS } from "@/lib/feature-preview-mocks";
import type { PermissionLockReason } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { RiLock2Line, RiStore2Line } from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";

interface SharedKaryawanPageProps {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}

const permissionLockLabels: Record<PermissionLockReason, string> = {
  missing_permission: "Akun ini belum memiliki permission karyawan.view.",
  feature_unavailable: "Fitur karyawan belum tersedia untuk toko ini.",
  unknown_permission: "Permission karyawan.view tidak dikenali.",
};

function KaryawanPermissionLocked({ reason }: { reason: PermissionLockReason | null }) {
  const lockReason = reason ?? "missing_permission";

  return (
    <div className="flex min-h-[55vh] items-center justify-center p-4">
      <Card className="max-w-xl border-primary/15 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <RiLock2Line className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl font-black tracking-tight">Karyawan terkunci</CardTitle>
              <CardDescription>{permissionLockLabels[lockReason]}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">Permission required: karyawan.view</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hubungi admin toko jika Anda membutuhkan akses data karyawan.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SharedKaryawanPage({ params, searchParams }: SharedKaryawanPageProps) {
  const { tokoid } = await params;
  const query = await searchParams;
  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";
  const scope = await getRequestScope(tokoid);
  const access = getPageFeatureCheck(scope, "karyawan.management");

  if (access.reason === "plan_required") {
    return (
      <FeaturePreview featureKey="karyawan.management" requiredPlan={access.metadata.minimumPlan}>
        <div className="space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">Karyawan</h1>
              <div className="h-6 w-1 rounded-full bg-primary" />
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
            key={initialSearchQuery}
            initialKaryawan={MOCK_KARYAWAN}
            initialStats={MOCK_KARYAWAN_STATS}
            tokoId={tokoid}
            tokoName="Toko Example"
            initialSearchQuery={initialSearchQuery}
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

  if (!can(scope, "karyawan.view")) {
    return <KaryawanPermissionLocked reason={getPermissionLockReason(scope, "karyawan.view")} />;
  }

  const toko = await prisma.store.findUnique({
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
            <div className="h-6 w-1 rounded-full bg-primary" />
            <div className="flex items-center gap-2">
              {toko?.logoUrl ? (
                <Image src={toko.logoUrl} alt={toko.name} width={20} height={20} className="h-5 w-5 rounded-md object-cover" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">Kelola karyawan toko</p>
        </div>
        <p className="text-destructive text-muted-foreground">{karyawanResult.error || "Gagal memuat data"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Karyawan</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div className="flex items-center gap-2">
            {toko?.logoUrl ? (
              <Image src={toko.logoUrl} alt={toko.name} width={20} height={20} className="h-5 w-5 rounded-md object-cover" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{toko?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola karyawan toko</p>
      </div>
      <ManageKaryawan
        key={initialSearchQuery}
        initialKaryawan={karyawanResult.data}
        initialStats={stats}
        tokoId={tokoid}
        tokoName={toko?.name ?? "Toko"}
        initialSearchQuery={initialSearchQuery}
        actionPermissions={{
          canCreate: can(scope, "karyawan.create"),
          canDelete: can(scope, "karyawan.deactivate"),
          canManagePermissions: can(scope, "karyawan.managePermissions"),
        }}
      />
    </div>
  );
}
