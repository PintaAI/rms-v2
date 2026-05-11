import Image from "next/image"
import { redirect } from "next/navigation"
import { getSupplierDebts, getSuppliers } from "@/actions/supplier-debts"
import { FeaturePreview } from "@/components/dashboard/feature-preview"
import { SupplierDebtTable } from "@/components/dashboard/supplier-debts/supplier-debt-table"
import { getPageFeatureCheck, getRequestScope } from "@/lib/auth/request-scope"
import prisma from "@/lib/prisma"
import { RiStore2Line } from "@remixicon/react"

interface AdminSupplierDebtsPageProps {
  params: Promise<{ tokoid: string }>
}

const emptyDebtResult = {
  items: [],
  totalDebtAmount: 0,
  totalPaidAmount: 0,
  totalRemainingAmount: 0,
  activeDebtCount: 0,
}

export default async function AdminSupplierDebtsPage({ params }: AdminSupplierDebtsPageProps) {
  const { tokoid } = await params
  const scope = await getRequestScope(tokoid)
  const access = getPageFeatureCheck(scope, "inventory.management")

  if (access.reason === "role_denied") redirect("/dashboard")
  if (access.reason === "disabled_by_toko") redirect(`/${tokoid}/admin`)

  if (access.reason === "plan_required") {
    return (
      <FeaturePreview featureKey="inventory.management" requiredPlan={access.metadata.minimumPlan}>
        <SupplierDebtsPageShell tokoId={tokoid} tokoName="Toko Example" debtResult={emptyDebtResult} suppliers={[]} readOnly />
      </FeaturePreview>
    )
  }

  const [toko, debtsResult, suppliersResult] = await Promise.all([
    prisma.toko.findUnique({ where: { id: tokoid }, select: { id: true, name: true, logoUrl: true } }),
    getSupplierDebts(tokoid),
    getSuppliers(tokoid),
  ])

  return (
    <SupplierDebtsPageShell
      tokoId={tokoid}
      tokoName={toko?.name ?? "Toko"}
      logoUrl={toko?.logoUrl}
      debtResult={debtsResult.data ?? emptyDebtResult}
      suppliers={suppliersResult.data ?? []}
    />
  )
}

function SupplierDebtsPageShell({
  tokoId,
  tokoName,
  logoUrl,
  debtResult,
  suppliers,
  readOnly = false,
}: {
  tokoId: string
  tokoName: string
  logoUrl?: string | null
  debtResult: Awaited<ReturnType<typeof getSupplierDebts>>["data"]
  suppliers: Awaited<ReturnType<typeof getSuppliers>>["data"]
  readOnly?: boolean
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Hutang Supplier</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <Image src={logoUrl} alt={tokoName} width={20} height={20} className="size-5 rounded-md object-cover" />
            ) : (
              <div className="flex size-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="size-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{tokoName}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">
          Catat nota supplier yang belum lunas dan pembayaran cicilannya.
        </p>
      </div>

      <SupplierDebtTable
        tokoId={tokoId}
        initialDebts={debtResult?.items ?? []}
        initialSuppliers={suppliers ?? []}
        readOnly={readOnly}
      />
    </div>
  )
}
