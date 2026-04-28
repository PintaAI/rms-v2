"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RiCheckboxCircleLine,
  RiDownload2Line,
} from "@remixicon/react";
import { getBrandIcon } from "@/lib/brand-icons";
import type { ServiceTableItem } from "./types";
import { formatCurrency, formatDate } from "./utils";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export type InvoicePreviewService = ServiceTableItem & {
  invoice: NonNullable<ServiceTableItem["invoice"]>;
};

export function isPaidInvoiceService(service: ServiceTableItem): service is InvoicePreviewService {
  return Boolean(service.invoice && (service.invoice.paymentStatus === "paid" || service.invoice.paymentStatus === "dp"));
}

function formatInvoiceDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return formatDate(new Date(value));
}

export function getInvoiceNumber(service: InvoicePreviewService): string {
  return service.invoice.invoiceNumber || `INV-${service.invoice.id.slice(0, 8).toUpperCase()}`;
}

function getInvoiceItems(service: InvoicePreviewService) {
  if (service.invoice.items?.length) {
    return service.invoice.items;
  }
  return [
    {
      id: `${service.invoice.id}-summary`,
      type: "Service",
      name: `Servis ${service.hpCatalog.brand.name} ${service.hpCatalog.modelName}`,
      qty: 1,
      price: service.invoice.grandTotal,
    },
  ];
}

function InvoicePreviewCard({
  service,
  invoiceRef,
}: {
  service: InvoicePreviewService;
  invoiceRef: React.RefObject<HTMLDivElement | null>;
}) {
  const items = getInvoiceItems(service);
  const hasDetailedItems = Boolean(service.invoice.items?.length);
  const brandIcon = getBrandIcon(service.hpCatalog.brand.name);
  const isDp = service.invoice.paymentStatus === "dp";

  return (
    <div ref={invoiceRef} className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm [&>*]:h-5 [&>*]:w-5">
            {brandIcon}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Repair Invoice</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight">RMS Service Center</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Bukti pembayaran servis perangkat. Invoice ini dapat diunduh sebagai arsip pelanggan.
            </p>
          </div>
        </div>

        {isDp ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-700">
              DP {service.invoice.dpAmount ? formatCurrency(service.invoice.dpAmount) : ""}
            </div>
            <p className="mt-1 text-xs text-amber-700/80">
              Sisa: {formatCurrency(service.invoice.grandTotal - (service.invoice.dpAmount || 0))}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-700">
              <RiCheckboxCircleLine className="h-4 w-4" />
              Lunas
            </div>
            <p className="mt-1 text-xs text-emerald-700/80">
              Dibayar pada {formatInvoiceDate(service.invoice.paidAt ?? service.checkoutAt)}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 py-6 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Invoice</p>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span>Nomor</span>
              <span className="font-semibold text-slate-900">{getInvoiceNumber(service)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Dibuat</span>
              <span className="font-semibold text-slate-900">{formatInvoiceDate(service.invoice.createdAt ?? service.checkinAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Ticket</span>
              <span className="font-semibold text-slate-900">{service.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pelanggan</p>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span>Nama</span>
              <span className="font-semibold text-slate-900">{service.customerName || "Pelanggan"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>No. WhatsApp</span>
              <span className="font-semibold text-slate-900">{service.noWa}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Device</span>
              <span className="font-semibold text-right text-slate-900">
                {service.hpCatalog.brand.name} {service.hpCatalog.modelName}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Item</th>
              <th className="px-4 py-3 text-left font-semibold">Tipe</th>
              <th className="px-4 py-3 text-center font-semibold">Qty</th>
              <th className="px-4 py-3 text-right font-semibold">Harga</th>
              <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || `${item.name}-${index}`} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                <td className="px-4 py-3 text-slate-600">{item.type || "Item"}</td>
                <td className="px-4 py-3 text-center text-slate-600">{item.qty}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.price)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(item.qty * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!hasDetailedItems && (
        <p className="mt-3 text-xs text-slate-500">
          Detail item belum tersedia. Invoice menampilkan total pembayaran final.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md space-y-2 text-sm text-slate-500">
          <p className="font-semibold text-slate-900">Catatan Servis</p>
          <p>{service.complaint}</p>
        </div>
        <div className="min-w-full rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-22">
          <div className=" flex items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">{isDp ? "Sisa Tagihan" : "Grand Total"}</p>
              <p className="mt-1 text-2xl font-black tracking-tight">{formatCurrency(isDp ? service.invoice.grandTotal - (service.invoice.dpAmount || 0) : service.invoice.grandTotal)}</p>
              {isDp && (
                <p className="mt-0.5 text-[0.65rem] text-white/40">DP: {formatCurrency(service.invoice.dpAmount || 0)}</p>
              )}
            </div>
            <Badge className="border-0 bg-white/12 px-3 py-1 text-white hover:bg-white/12">{isDp ? "DP" : "Lunas"}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoiceDialog({
  service,
  open,
  onOpenChange,
}: {
  service: InvoicePreviewService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeExport, setActiveExport] = React.useState<boolean>(false);
  const invoiceCardRef = React.useRef<HTMLDivElement>(null);

  const handleDownloadInvoice = React.useCallback(async () => {
    if (!service || !invoiceCardRef.current) return;

    try {
      setActiveExport(true);
      const dataUrl = await toPng(invoiceCardRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${getInvoiceNumber(service).toLowerCase()}.png`;
      link.click();
    } catch (error) {
      console.error("PNG export error:", error);
      toast.error("Gagal mengunduh invoice sebagai PNG");
    } finally {
      setActiveExport(false);
    }
  }, [service]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-w-5xl  overflow-hidden" showCloseButton={false}>
        {service && (
          <>
            <DialogHeader >
              <DialogTitle className="text-base font-semibold">
                Invoice {getInvoiceNumber(service)}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Invoice berstatus {service.invoice.paymentStatus === "dp" ? "DP" : "paid"}. Anda bisa mengunduhnya sebagai PNG.
              </DialogDescription>
            </DialogHeader>

            <div className="absolute top-4 right-4">
              <Button
                type="button"
                size="sm"
                onClick={handleDownloadInvoice}
                disabled={activeExport}
              >
                <RiDownload2Line className="mr-1.5 h-3.5 w-3.5" />
                {activeExport ? "Mengunduh..." : "Download PNG"}
              </Button>
            </div>

           
              <InvoicePreviewCard service={service} invoiceRef={invoiceCardRef} />
            
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
