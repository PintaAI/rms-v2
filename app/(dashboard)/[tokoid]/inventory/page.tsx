import { getInventoryItems, getServicePricelists } from "@/actions/inventory";
import { getTokoHeader } from "@/actions/toko";
import { InventoryTabs, type InventoryActionPermissions } from "@/components/dashboard/inventory/inventory-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { assertFeature, can, getPermissionLockReason, getRequestScope } from "@/lib/auth/request-scope";
import type { PermissionLockReason } from "@/lib/permissions";
import { RiLock2Line, RiStore2Line } from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";

interface SharedInventoryPageProps {
  params: Promise<{ tokoid: string }>;
  searchParams: Promise<{ tab?: string | string[]; q?: string | string[] }>;
}

const permissionLockLabels: Record<PermissionLockReason, string> = {
  missing_permission: "Akun ini belum memiliki permission inventory.view.",
  feature_unavailable: "Fitur inventory belum tersedia untuk toko ini.",
  unknown_permission: "Permission inventory.view tidak dikenali.",
};

function InventoryPermissionLocked({ reason }: { reason: PermissionLockReason | null }) {
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
              <CardTitle className="text-xl font-black tracking-tight">Inventory terkunci</CardTitle>
              <CardDescription>{permissionLockLabels[lockReason]}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">Permission required: inventory.view</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hubungi admin toko jika Anda membutuhkan akses ke module inventory.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SharedInventoryPage({ params, searchParams }: SharedInventoryPageProps) {
  const { tokoid } = await params;
  const query = await searchParams;
  const tab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const initialSearchQuery = Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "";
  const scope = await getRequestScope(tokoid);
  const canViewInventory = can(scope, "inventory.view");
  const canManageRetail = can(scope, "inventory.manageRetail");
  const canManagePhoneUnits = can(scope, "inventory.managePhoneUnits");

  if (!canViewInventory && !canManageRetail && !canManagePhoneUnits) {
    return <InventoryPermissionLocked reason={getPermissionLockReason(scope, "inventory.view")} />;
  }

  if (scope.user.role === "staff") assertFeature(scope, "staff.workflow");
  if (scope.user.role === "technician") assertFeature(scope, "technician.workflow");

  const initialTab = tab === "retail" && canManageRetail
    ? "retail"
    : tab === "phone_unit" && canManagePhoneUnits
      ? "phone_unit"
      : tab === "jasa" && canViewInventory
        ? "jasa"
        : canViewInventory
          ? "sparepart"
          : canManagePhoneUnits
            ? "phone_unit"
            : "retail";

  const actionPermissions: InventoryActionPermissions = {
    canViewInventory,
    canCreateSparepart: canViewInventory && can(scope, "inventory.create"),
    canUpdateSparepart: canViewInventory && can(scope, "inventory.update"),
    canDeleteSparepart: canViewInventory && can(scope, "inventory.delete"),
    canRestockSparepart: canViewInventory && can(scope, "inventory.restock"),
    canImportSparepart: canViewInventory && can(scope, "inventory.import"),
    canManageServicePricelists: canViewInventory && can(scope, "inventory.manageServicePricelists"),
    canViewRestockHistory: canViewInventory && can(scope, "inventory.viewHistory"),
    canManageRetail,
    canManagePhoneUnits,
  };

  const [toko, sparepartsResult, pricelistsResult] = await Promise.all([
    getTokoHeader(tokoid),
    canViewInventory ? getInventoryItems(tokoid, "repair_part") : Promise.resolve({ success: true as const, data: [] }),
    canViewInventory ? getServicePricelists(tokoid) : Promise.resolve({ success: true as const, data: [] }),
  ]);
  const tokoHeader = toko.success ? toko.data : null;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight">Inventory</h1>
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div className="flex items-center gap-2">
            {tokoHeader?.logoUrl ? (
              <Image
                src={tokoHeader.logoUrl}
                alt={tokoHeader.name}
                width={20}
                height={20}
                className="h-5 w-5 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted">
                <RiStore2Line className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground">{tokoHeader?.name || "Toko"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70">Kelola sparepart, jasa service, dan barang retail berdasarkan permission akun.</p>
      </div>
      <InventoryTabs
        key={`${initialTab}-${initialSearchQuery}`}
        tokoId={tokoid}
        initialSpareparts={sparepartsResult.success ? sparepartsResult.data ?? [] : []}
        initialPricelists={pricelistsResult.success ? pricelistsResult.data ?? [] : []}
        initialTab={initialTab}
        initialSearchQuery={initialSearchQuery}
        actionPermissions={actionPermissions}
        showRestockHistoryLink={false}
      />
    </div>
  );
}
