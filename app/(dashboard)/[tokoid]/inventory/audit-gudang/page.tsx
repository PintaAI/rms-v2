import { getInventoryAuditOverview } from "@/actions/inventory-audit"
import { FeatureLocked } from "@/components/dashboard/feature-locked"
import { FeaturePreview } from "@/components/dashboard/feature-preview"
import { AuditDashboard } from "@/components/dashboard/inventory/audit-gudang/audit-dashboard"
import type { InventoryAuditOverview } from "@/components/dashboard/inventory/audit-gudang/types"
import { PermissionLocked } from "@/components/dashboard/permission-locked"
import { assertFeature, can, getRequestScope, getPageFeatureCheck, getPermissionLockReason } from "@/lib/auth/request-scope"
import { MOCK_AUDIT_OVERVIEW } from "@/lib/feature-preview-mocks"
import prisma from "@/lib/prisma"
import { RiStore2Line } from "@remixicon/react"
import Image from "next/image"
import { redirect } from "next/navigation"

type AuditGudangPageProps = {
  params: Promise<{ tokoid: string }>
}

type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

export default async function AuditGudangPage({ params }: AuditGudangPageProps) {
  const { tokoid } = await params
  const scope = await getRequestScope(tokoid)
  const access = getPageFeatureCheck(scope, "inventory.audit")
  const permissionReason = getPermissionLockReason(scope, "inventory.audit")

  if (!can(scope, "inventory.audit") && permissionReason === "missing_permission") {
    return <PermissionLocked title="Audit Gudang" permission="inventory.audit" reason={permissionReason} />
  }

  if (access.reason === "disabled_by_toko") redirect(`/${tokoid}/inventory`)

  if (access.reason === "plan_required") {
    return (
      <FeaturePreview featureKey="inventory.audit" requiredPlan={access.metadata.minimumPlan}>
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Audit Gudang</h1>
            <div className="h-6 w-1 rounded-full bg-primary" />
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Toko Example</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/70">
            Cocokkan stok sistem dengan stok fisik, temukan penyebab selisih.
          </p>
          <AuditDashboard tokoId={tokoid} initialOverview={MOCK_AUDIT_OVERVIEW} />
        </div>
      </FeaturePreview>
    )
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
    )
  }

  if (!can(scope, "inventory.audit")) {
    return <PermissionLocked title="Audit Gudang" permission="inventory.audit" reason={permissionReason} />
  }
  if (scope.user.role === "staff") assertFeature(scope, "staff.workflow")
  if (scope.user.role === "technician") assertFeature(scope, "technician.workflow")

  const [toko, overviewResult] = await Promise.all([
    prisma.toko.findUnique({
      where: { id: tokoid },
      select: { id: true, name: true, logoUrl: true },
    }),
    getInventoryAuditOverview(tokoid) as Promise<ActionResult<InventoryAuditOverview>>,
  ])

  const overview = overviewResult.success && overviewResult.data
    ? overviewResult.data
    : { activeSession: null, recentSessions: [] }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Audit Gudang</h1>
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
        <p className="text-sm text-muted-foreground/70">
          Cocokkan stok sistem dengan stok fisik, temukan penyebab selisih, lalu sesuaikan stok dengan riwayat audit.
        </p>
        {!overviewResult.success && (
          <p className="text-xs text-destructive">{overviewResult.error ?? "Gagal memuat overview audit"}</p>
        )}
      </div>
      <AuditDashboard tokoId={tokoid} initialOverview={overview} />
    </div>
  )
}
