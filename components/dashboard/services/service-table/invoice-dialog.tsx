"use client";

import React from "react";
import Image from "next/image";
import { getTokoInvoiceSettings } from "@/actions/toko";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RiCheckboxCircleLine,
  RiDownload2Line,
  RiPrinterLine,
} from "@remixicon/react";
import { getBrandIcon } from "@/lib/brand-icons";
import type { ServiceTableItem } from "./types";
import { formatCurrency, formatDate } from "./utils";
import { toPng } from "html-to-image";
import { toast } from "sonner";

type PaidInvoiceService = ServiceTableItem & {
  invoice: NonNullable<ServiceTableItem["invoice"]>;
};

export type InvoicePreviewService = ServiceTableItem;

type InvoiceNoteMode = "service-note" | "pickup-note" | "dp-invoice" | "paid-invoice";

type InvoiceSettings = {
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  invoiceTerms: string;
  invoiceWarranty: string;
};

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  name: "RMS Service Center",
  address: null,
  phone: null,
  logoUrl: null,
  invoiceTerms: "Barang yang tidak diambil lebih dari 30 hari di luar tanggung jawab toko.",
  invoiceWarranty: "Garansi berlaku sesuai jenis kerusakan dan tidak berlaku untuk kerusakan fisik/cairan.",
};

export function isPaidInvoiceService(service: ServiceTableItem): service is PaidInvoiceService {
  return Boolean(service.invoice && (service.invoice.paymentStatus === "paid" || service.invoice.paymentStatus === "dp"));
}

function getInvoiceNoteMode(service: InvoicePreviewService): InvoiceNoteMode {
  if (!service.invoice) return "service-note";
  if (service.invoice.paymentStatus === "paid") return "paid-invoice";
  if (service.invoice.paymentStatus === "dp") return "dp-invoice";
  return "pickup-note";
}

function getInvoiceTitle(mode: InvoiceNoteMode): string {
  switch (mode) {
    case "paid-invoice":
      return "Repair Invoice";
    case "dp-invoice":
      return "Invoice DP Service";
    case "pickup-note":
      return "Nota Pengambilan HP Service";
    case "service-note":
      return "Nota Service";
  }
}

function getInvoiceDescription(mode: InvoiceNoteMode): string {
  switch (mode) {
    case "paid-invoice":
      return "Bukti pembayaran servis perangkat. Invoice ini dapat diunduh sebagai arsip pelanggan.";
    case "dp-invoice":
      return "Bukti pembayaran DP servis perangkat. Sisa tagihan masih perlu dilunasi.";
    case "pickup-note":
      return "Bukti pengambilan perangkat service. Nota ini bukan bukti pembayaran lunas.";
    case "service-note":
      return "Bukti pencatatan perangkat service. Invoice pembayaran belum dibuat.";
  }
}

function getDialogDescription(service: InvoicePreviewService, mode: InvoiceNoteMode): string {
  switch (mode) {
    case "paid-invoice":
      return "Invoice berstatus paid. Anda bisa mengunduh atau mencetaknya.";
    case "dp-invoice":
      return "Invoice berstatus DP. Anda bisa mengunduh atau mencetaknya.";
    case "pickup-note":
      return "Invoice belum lunas. Cetakan ini digunakan sebagai nota pengambilan HP service.";
    case "service-note":
      return service.invoice
        ? "Nota service bisa dicetak dari data service."
        : "Invoice belum tersedia. Nota tetap bisa dicetak dari data service.";
  }
}

function formatInvoiceDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return formatDate(new Date(value));
}

export function getInvoiceNumber(service: InvoicePreviewService): string {
  if (!service.invoice) return `SRV-${service.id.slice(0, 8).toUpperCase()}`;
  return service.invoice.invoiceNumber || `INV-${service.invoice.id.slice(0, 8).toUpperCase()}`;
}

function getInvoiceItems(service: InvoicePreviewService) {
  if (service.invoice?.items?.length) {
    return service.invoice.items;
  }
  return [
    {
      id: `${service.invoice?.id || service.id}-summary`,
      type: "Service",
      name: `Servis ${service.hpCatalog.brand.name} ${service.hpCatalog.modelName}`,
      qty: 1,
      price: service.invoice?.grandTotal || 0,
    },
  ];
}

async function renderInvoiceToPng(invoiceCard: HTMLDivElement) {
  return toPng(invoiceCard, {
    cacheBust: true,
    backgroundColor: "#ffffff",
    pixelRatio: 2,
  });
}

function InvoicePreviewCard({
  service,
  invoiceSettings,
  invoiceRef,
}: {
  service: InvoicePreviewService;
  invoiceSettings: InvoiceSettings;
  invoiceRef: React.RefObject<HTMLDivElement | null>;
}) {
  const items = getInvoiceItems(service);
  const mode = getInvoiceNoteMode(service);
  const hasInvoice = Boolean(service.invoice);
  const hasDetailedItems = Boolean(service.invoice?.items?.length);
  const paymentStatus = service.invoice?.paymentStatus;
  const isDp = paymentStatus === "dp";
  const isPaid = paymentStatus === "paid";
  const grandTotal = service.invoice?.grandTotal || 0;
  const dpAmount = service.invoice?.dpAmount || 0;
  const discountAmount = service.invoice?.discountAmount || 0;
  const finalTotal = Math.max(0, grandTotal - dpAmount - discountAmount);

  return (
    <div ref={invoiceRef} className="w-full min-w-[720px] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          {invoiceSettings.logoUrl ? (
            <Image
              src={invoiceSettings.logoUrl}
              alt={invoiceSettings.name}
              width={56}
              height={56}
              unoptimized
              className="h-14 w-14 rounded-2xl border border-slate-200 object-cover shadow-sm"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm [&>*]:h-5 [&>*]:w-5">
              {getBrandIcon(service.hpCatalog.brand.name)}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{getInvoiceTitle(mode)}</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight">{invoiceSettings.name}</h3>
            {(invoiceSettings.address || invoiceSettings.phone) && (
              <div className="mt-1 space-y-0.5 text-xs leading-5 text-slate-500">
                {invoiceSettings.address && <p>{invoiceSettings.address}</p>}
                {invoiceSettings.phone && <p>{invoiceSettings.phone}</p>}
              </div>
            )}
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {getInvoiceDescription(mode)}
            </p>
          </div>
        </div>

        {!hasInvoice ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              Nota Service
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Invoice belum dibuat
            </p>
          </div>
        ) : isDp ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-700">
              DP {dpAmount ? formatCurrency(dpAmount) : ""}
            </div>
            <p className="mt-1 text-xs text-amber-700/80">
              Sisa: {formatCurrency(finalTotal)}
            </p>
          </div>
        ) : isPaid ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-700">
              <RiCheckboxCircleLine className="h-4 w-4" />
              Lunas
            </div>
            <p className="mt-1 text-xs text-emerald-700/80">
              Dibayar pada {formatInvoiceDate(service.invoice?.paidAt ?? service.checkoutAt)}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              Nota Pengambilan
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Tagihan belum lunas
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 py-6 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{mode === "pickup-note" ? "Nota Pengambilan" : "Invoice"}</p>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span>Nomor</span>
              <span className="font-semibold text-slate-900">{getInvoiceNumber(service)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Dibuat</span>
              <span className="font-semibold text-slate-900">{formatInvoiceDate(service.invoice?.createdAt ?? service.checkinAt)}</span>
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
          {mode === "pickup-note"
            ? "Detail item belum tersedia. Nota pengambilan menampilkan total tagihan service."
            : hasInvoice
              ? "Detail item belum tersedia. Invoice menampilkan total pembayaran final."
              : "Invoice belum tersedia. Nota menampilkan data service yang sudah tercatat."}
        </p>
      )}

      {mode === "pickup-note" && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nota ini adalah bukti pengambilan HP service, bukan bukti pembayaran lunas. Tagihan masih perlu diselesaikan.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md space-y-2 text-sm text-slate-500">
          <p className="font-semibold text-slate-900">Catatan Servis</p>
          <p>{service.complaint}</p>
        </div>
        <div className="min-w-full rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-sm sm:min-w-80">
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Ringkasan Pembayaran</p>
              <div className="space-y-1 text-sm text-white/60">
                <div className="flex items-center justify-between gap-4">
                  <span>Total sebelum diskon</span>
                  <span className="font-semibold tabular-nums text-white">{formatCurrency(grandTotal)}</span>
                </div>
                {dpAmount > 0 && (
                  <div className="flex items-center justify-between gap-4">
                    <span>DP dibayar</span>
                    <span className="font-semibold tabular-nums text-white">- {formatCurrency(dpAmount)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between gap-4">
                    <span>Diskon</span>
                    <span className="font-semibold tabular-nums text-white">- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">{mode === "pickup-note" ? "Total Tagihan" : "Total Bayar"}</p>
                <p className="text-2xl font-black tracking-tight">{formatCurrency(finalTotal)}</p>
              </div>
            </div>
            <Badge className="border-0 bg-white/12 px-3 py-1 text-white hover:bg-white/12">{!hasInvoice ? "Nota" : isPaid ? "Lunas" : isDp ? "DP" : "Pengambilan"}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Syarat & Ketentuan</p>
          <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">{invoiceSettings.invoiceTerms}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Garansi Service</p>
          <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">{invoiceSettings.invoiceWarranty}</p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-full rounded-2xl border border-slate-200 p-4 text-center sm:w-64">
          <p className="text-sm font-semibold text-slate-900">Customer</p>
          <div className="mt-16 border-t border-slate-300 pt-2 text-xs text-slate-500">
            {service.customerName || "Pelanggan"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoiceDialog({
  service,
  tokoId,
  open,
  onOpenChange,
}: {
  service: InvoicePreviewService | null;
  tokoId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeExport, setActiveExport] = React.useState<boolean>(false);
  const [activePrint, setActivePrint] = React.useState<boolean>(false);
  const [invoiceSettings, setInvoiceSettings] = React.useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const invoiceCardRef = React.useRef<HTMLDivElement>(null);
  const mode = service ? getInvoiceNoteMode(service) : null;
  const effectiveInvoiceSettings = tokoId ? invoiceSettings : DEFAULT_INVOICE_SETTINGS;

  React.useEffect(() => {
    if (!open || !service || !tokoId) {
      return;
    }

    let cancelled = false;
    const currentTokoId = tokoId;

    async function loadInvoiceSettings() {
      const result = await getTokoInvoiceSettings(currentTokoId);

      if (cancelled) return;

      if (result.success && result.data) {
        setInvoiceSettings(result.data);
      } else {
        setInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
      }
    }

    loadInvoiceSettings();

    return () => {
      cancelled = true;
    };
  }, [open, service, tokoId]);

  const handleDownloadInvoice = React.useCallback(async () => {
    if (!service || !invoiceCardRef.current) return;

    try {
      setActiveExport(true);
      const dataUrl = await renderInvoiceToPng(invoiceCardRef.current);
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

  const handlePrintInvoice = React.useCallback(async () => {
    if (!service || !invoiceCardRef.current) return;

    try {
      setActivePrint(true);
      const printWindow = window.open("", "_blank", "width=900,height=700");

      if (!printWindow) {
        toast.error("Popup print diblokir browser");
        return;
      }

      const dataUrl = await renderInvoiceToPng(invoiceCardRef.current);

      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <title>${getInvoiceNumber(service)}</title>
            <style>
              body { margin: 0; background: #f8fafc; }
              img { display: block; width: 100%; max-width: 900px; margin: 0 auto; }
              @media print { body { background: #fff; } img { max-width: 100%; } }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Nota service" onload="window.focus(); window.print();" />
          </body>
        </html>`);
      printWindow.document.close();
    } catch (error) {
      console.error("Print invoice error:", error);
      toast.error("Gagal menyiapkan nota untuk print");
    } finally {
      setActivePrint(false);
    }
  }, [service]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] flex-col overflow-hidden sm:max-w-5xl" showCloseButton={false}>
        {service && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">
                  {mode ? getInvoiceTitle(mode) : "Nota"} {getInvoiceNumber(service)}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  {mode ? getDialogDescription(service, mode) : "Nota bisa diunduh atau dicetak."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handlePrintInvoice}
                  disabled={activePrint || activeExport}
                  className="w-full justify-center sm:w-auto"
                >
                  <RiPrinterLine className="mr-1.5 h-3.5 w-3.5" />
                  {activePrint ? "Menyiapkan..." : "Print"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownloadInvoice}
                  disabled={activeExport || activePrint}
                  className="w-full justify-center sm:w-auto"
                >
                  <RiDownload2Line className="mr-1.5 h-3.5 w-3.5" />
                  {activeExport ? "Mengunduh..." : "Download PNG"}
                </Button>
              </div>
            </div>


            <ScrollArea className="h-full min-h-0 flex-1 pr-3">
              <div className="pb-4">
                <InvoicePreviewCard service={service} invoiceSettings={effectiveInvoiceSettings} invoiceRef={invoiceCardRef} />
              </div>
            </ScrollArea>

          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
