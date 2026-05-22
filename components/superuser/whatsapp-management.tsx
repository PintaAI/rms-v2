"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getSuperuserWhatsappInstances,
  revokeSuperuserWhatsappInstance,
  type SuperuserWhatsappInstanceRow,
} from "@/actions/superuser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RiWhatsappLine,
  RiDeleteBinLine,
  RiStore2Line,
  RiUserLine,
  RiAlertLine,
  RiRefreshLine,
} from "@remixicon/react";

function connectionStatusBadge(state: string | null) {
  switch (state) {
    case "open":
      return <Badge variant="success">Connected</Badge>;
    case "connecting":
      return <Badge variant="warning">Connecting</Badge>;
    case "pairing":
      return <Badge variant="accent">Pairing</Badge>;
    case "close":
      return <Badge variant="secondary">Disconnected</Badge>;
    default:
      return <Badge variant="secondary">{state ?? "Unknown"}</Badge>;
  }
}

export function WhatsappManagement() {
  const [isPending, startTransition] = useTransition();
  const [instances, setInstances] = useState<SuperuserWhatsappInstanceRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<SuperuserWhatsappInstanceRow | null>(null);

  const loadInstances = () => {
    startTransition(async () => {
      const result = await getSuperuserWhatsappInstances();
      setHasLoaded(true);
      if (!result.success) {
        toast.error(result.error || "Failed to load WhatsApp instances");
        return;
      }
      setInstances(result.data ?? []);
    });
  };

  useEffect(() => {
    loadInstances();
  }, []);

  const handleRevoke = () => {
    if (!revokeTarget) return;
    startTransition(async () => {
      const result = await revokeSuperuserWhatsappInstance(revokeTarget.instanceName);
      if (!result.success) {
        toast.error(result.error || "Failed to revoke instance");
        return;
      }
      toast.success(`Instance "${revokeTarget.instanceName}" revoked`);
      setInstances((current) => current.filter((row) => row.instanceName !== revokeTarget.instanceName));
      setRevokeTarget(null);
    });
  };

  return (
    <>
      <Card className="overflow-hidden border-border/50 shadow-lg shadow-black/5">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">WhatsApp Instances</CardTitle>
            <p className="text-sm text-muted-foreground">
              Evolution API instances - revoke disconnected or rogue connections from here.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadInstances} disabled={isPending}>
            <RiRefreshLine data-icon="inline-start" className={isPending ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!hasLoaded && isPending ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Loading WhatsApp instances...
            </div>
          ) : instances.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No WhatsApp instances found in Evolution API.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linked Toko</TableHead>
                    <TableHead>Connected Number</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map((row) => (
                    <TableRow key={row.instanceName}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RiWhatsappLine className="size-4 text-muted-foreground shrink-0" />
                          <div>
                            <div className="font-mono text-xs">{row.instanceName}</div>
                            {row.instanceId && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-40">
                                {row.instanceId}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{connectionStatusBadge(row.status)}</TableCell>
                      <TableCell>
                        {row.storeId ? (
                          <div className="flex items-center gap-1.5">
                            <RiStore2Line className="size-3.5 text-muted-foreground shrink-0" />
                            <div>
                              <div className="text-sm font-medium">{row.tokoName ?? "—"}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{row.storeId}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.connectedNumber ? (
                          <div className="flex items-center gap-1.5">
                            <RiUserLine className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono text-sm">+{row.connectedNumber}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{row.profileName ?? "—"}</div>
                        {row.dbEnabled && (
                          <Badge variant="outline" className="mt-0.5 text-[10px]">DB</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => setRevokeTarget(row)}
                        >
                          <RiDeleteBinLine data-icon="inline-start" />
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <RiAlertLine className="size-5" />
              Revoke WhatsApp Instance
            </DialogTitle>
            <DialogDescription>
              {revokeTarget
                ? `This will permanently delete the Evolution instance "${revokeTarget.instanceName}" and clear its tokens from the database. ${revokeTarget.tokoName ? `The toko "${revokeTarget.tokoName}" will lose WhatsApp connection.` : "No toko is linked to this instance."}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            <RiDeleteBinLine className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>This action cannot be undone. The WhatsApp instance will be permanently removed from Evolution API.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isPending}>
              {isPending ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
