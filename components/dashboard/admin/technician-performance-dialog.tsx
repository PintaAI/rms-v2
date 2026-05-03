"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTechnicianPerformanceDetail } from "@/actions/karyawan";
import type { KaryawanItem, TechnicianPerformanceDetail } from "@/actions/karyawan";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiLoader4Line,
  RiMoneyDollarCircleLine,
  RiToolsLine,
} from "@remixicon/react";

interface TechnicianPerformanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technician: KaryawanItem | null;
  tokoId: string;
}

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="rounded-lg bg-background p-1.5 text-muted-foreground shadow-sm">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

export function TechnicianPerformanceDialog({
  open,
  onOpenChange,
  technician,
  tokoId,
}: TechnicianPerformanceDialogProps) {
  const [detail, setDetail] = useState<TechnicianPerformanceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !technician) {
      return;
    }

    let cancelled = false;
    const technicianId = technician.id;

    async function loadDetail() {
      setIsLoading(true);
      setError(null);

      const result = await getTechnicianPerformanceDetail(tokoId, technicianId);

      if (cancelled) return;

      if (!result.success || !result.data) {
        setDetail(null);
        setError(result.error || "Gagal memuat detail performance");
        setIsLoading(false);
        return;
      }

      setDetail(result.data);
      setIsLoading(false);
    }

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [open, technician, tokoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiToolsLine className="size-5 text-primary" />
            Detail Performance Teknisi
          </DialogTitle>
          <DialogDescription>
            {technician
              ? `Hasil service yang sudah dihandle oleh ${technician.name} dalam 30 hari terakhir.`
              : "Pilih teknisi untuk melihat detail performance."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
              <RiLoader4Line className="size-7 animate-spin" />
              <p className="text-sm">Memuat detail performance...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
          ) : detail ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <SummaryTile
                  label="Handled"
                  value={detail.summary.servicesHandled}
                  icon={<RiToolsLine className="size-4" />}
                />
                <SummaryTile
                  label="Selesai"
                  value={detail.summary.servicesCompleted}
                  icon={<RiCheckboxCircleLine className="size-4 text-green-600 dark:text-green-400" />}
                />
                <SummaryTile
                  label="Gagal"
                  value={detail.summary.servicesFailed}
                  icon={<RiCloseCircleLine className="size-4 text-red-600 dark:text-red-400" />}
                />
                <SummaryTile
                  label="Success Rate"
                  value={`${detail.summary.successRate}%`}
                  icon={<RiCheckboxCircleLine className="size-4 text-primary" />}
                />
                <SummaryTile
                  label="Paid Revenue"
                  value={formatCurrency(detail.summary.paidRevenue)}
                  icon={<RiMoneyDollarCircleLine className="size-4 text-emerald-600 dark:text-emerald-400" />}
                />
              </div>

              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Riwayat Service</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="min-w-36">Customer</TableHead>
                        <TableHead className="min-w-40">Device</TableHead>
                        <TableHead className="min-w-56">Keluhan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="min-w-36">Selesai</TableHead>
                        <TableHead className="text-right">Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.services.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Belum ada service selesai atau gagal dalam 30 hari terakhir.
                          </TableCell>
                        </TableRow>
                      ) : (
                        detail.services.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="font-medium">{service.customerName || "Pelanggan"}</p>
                                <p className="text-xs text-muted-foreground">{service.noWa}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {service.hpCatalog.brand.name} {service.hpCatalog.modelName}
                            </TableCell>
                            <TableCell className="max-w-72 truncate" title={service.complaint}>
                              {service.complaint}
                            </TableCell>
                            <TableCell>
                              <Badge variant={service.status === "done" ? "success" : "destructive"}>
                                {service.status === "done" ? "Selesai" : "Gagal"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(service.doneAt)}</TableCell>
                            <TableCell className="text-right">
                              {service.invoice ? (
                                <div className="space-y-0.5">
                                  <p className="font-semibold tabular-nums">{formatCurrency(service.invoice.grandTotal)}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{service.invoice.paymentStatus}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
