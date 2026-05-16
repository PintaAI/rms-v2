import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PermissionLockReason } from "@/lib/permissions";
import { RiLock2Line } from "@remixicon/react";
import Link from "next/link";

const permissionLockLabels: Record<PermissionLockReason, string> = {
  missing_permission: "Akun ini belum memiliki permission service.view.",
  feature_unavailable: "Fitur service belum tersedia untuk toko ini.",
  unknown_permission: "Permission service.view tidak dikenali.",
};

export function ServicePermissionLocked({ reason }: { reason: PermissionLockReason | null }) {
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
              <CardTitle className="text-xl font-black tracking-tight">Service terkunci</CardTitle>
              <CardDescription>{permissionLockLabels[lockReason]}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">Permission required: service.view</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hubungi admin toko jika Anda membutuhkan akses ke module service.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
