import type { ServiceTableItem } from "./types";
import {
  RiUserLine,
  RiUserStarLine,
  RiInboxArchiveLine,
  RiInboxUnarchiveLine,
  RiCheckLine,
  RiCheckDoubleLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getBrandIcon } from "@/lib/brand-icons";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, getPaymentStatusColor, getStatusIcon } from "./utils";

export interface ColumnDef {
  key: string;
  header: string;
  render: (service: ServiceTableItem) => React.ReactNode;
  width?: number;
}

function parseNoteStatus(note: string) {
  const match = note.match(/^\{(GAGAL|BERHASIL)\}\s*/);
  if (!match) return { label: null, note };
  const label = match[1];
  return {
    label,
    note: note.replace(/^\{(?:GAGAL|BERHASIL)\}\s*/, "").trim() || label,
  };
}

function getInvoiceDisplayTotal(service: ServiceTableItem) {
  const grandTotal = service.invoice?.grandTotal ?? 0;
  const dpAmount = service.invoice?.dpAmount ?? 0;
  const discountAmount = service.invoice?.discountAmount ?? 0;
  const totalRefund = (service.warrantyClaims ?? [])
    .filter((claim) => claim.status === "resolved" && claim.refundAmount > 0)
    .reduce((sum, claim) => sum + claim.refundAmount, 0);

  return {
    originalTotal: grandTotal,
    netTotal: Math.max(0, grandTotal - dpAmount - discountAmount - totalRefund),
    totalRefund,
  };
}

export const columnRegistry: Record<string, ColumnDef> = {
  customer: {
    key: "customer",
    header: "Customer",
    render: (service) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
          <RiUserLine className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold truncate">{service.customerName || "-"}</span>
          <span className="text-xs text-muted-foreground truncate">{service.noWa}</span>
        </div>
      </div>
    ),
    width: 180,
  },

  device: {
    key: "device",
    header: "Device",
    render: (service) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-muted-foreground">
          {getBrandIcon(service.hpCatalog.brand.name)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{service.hpCatalog.brand.name}</div>
          <div className="text-xs text-muted-foreground truncate">{service.hpCatalog.modelName}</div>
        </div>
      </div>
    ),
    width: 150,
  },

  complaint: {
    key: "complaint",
    header: "Keluhan & Penanganan",
    render: (service) => (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-start gap-1.5">
          <Tooltip>
            <TooltipTrigger className="block max-w-[500px] truncate text-left cursor-default">
              {service.complaint}
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">{service.complaint}</TooltipContent>
          </Tooltip>
          {service.handlingNote && (
            <Tooltip>
              <TooltipTrigger className="block max-w-[500px] truncate text-left text-xs text-muted-foreground cursor-default">
                Penanganan: {service.handlingNote}
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">{service.handlingNote}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {service.includedItems && service.includedItems.length > 0 && (
          <Tooltip>
            <TooltipTrigger className="flex flex-wrap gap-1 cursor-default">
              {service.includedItems.slice(0, 2).map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
              ))}
              {service.includedItems.length > 2 && <Badge variant="outline" className="text-xs">+{service.includedItems.length - 2}</Badge>}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="flex flex-wrap gap-1">
                {service.includedItems.map((item, i) => (
                  <Badge key={i} variant="default" className="bg-black text-foreground text-xs hover:bg-black/90">{item}</Badge>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    ),
    width: 180,
  },

  includedItems: {
    key: "includedItems",
    header: "Items",
    render: (service) => {
      if (!service.includedItems || service.includedItems.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }
      const items = service.includedItems as string[];
      return (
        <Tooltip>
          <TooltipTrigger className="flex gap-1 flex-wrap cursor-default">
            {items.slice(0, 2).map((item, i) => (
              <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
            ))}
            {items.length > 2 && <Badge variant="outline" className="text-xs">+{items.length - 2}</Badge>}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="flex flex-wrap gap-1">
              {items.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    },
    width: 120,
  },

  note: {
    key: "note",
    header: "Note",
    render: (service) => {
      if (!service.note) return <span className="text-muted-foreground">-</span>;
      const parsedNote = parseNoteStatus(service.note);
      return (
        <Tooltip>
          <TooltipTrigger className="block max-w-xs cursor-default text-left">
            <div className="flex items-center gap-2 truncate">
              {parsedNote.label && (
                <Badge variant={parsedNote.label === "GAGAL" ? "destructive" : "outline"} className="shrink-0 text-[0.6rem] uppercase">
                  {parsedNote.label}
                </Badge>
              )}
              <span className="truncate">{parsedNote.note}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="flex items-start gap-2">
              {parsedNote.label && (
                <Badge variant={parsedNote.label === "GAGAL" ? "destructive" : "outline"} className="shrink-0 text-[0.6rem] uppercase">
                  {parsedNote.label}
                </Badge>
              )}
              <span>{parsedNote.note}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    },
    width: 100,
  },

  createdBy: {
    key: "createdBy",
    header: "Created By",
    render: (service) =>
      service.createdBy?.name ? (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <RiUserStarLine className="h-3 w-3 text-primary" />
          </div>
          <span className="font-medium text-sm">{service.createdBy.name}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-muted/50 flex items-center justify-center">
            <RiUserLine className="h-3 w-3 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">Unknown</span>
        </div>
      ),
    width: 120,
  },

  status: {
    key: "status",
    header: "Status",
    render: (service) => {
      const StatusIcon = getStatusIcon(service.status);
      return (
        <div className="flex flex-wrap items-start gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusColor(service.status)}>
              {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
              {getStatusLabel(service.status)}
              {service.status === "done" && service.doneAt && (
                <span className="ml-1.5 text-[0.65rem] font-normal opacity-90">
                  {new Intl.DateTimeFormat("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(service.doneAt))}
                </span>
              )}
            </Badge>
          </div>
          {service.isPickedUp && (
            <Badge variant="outline" className="w-fit">
              <RiCheckLine className="h-3 w-3 mr-1" />
              Di Ambil
            </Badge>
          )}
        </div>
      );
    },
    width: 120,
  },

  technician: {
    key: "technician",
    header: "Teknisi",
    width: 140,
    render: (service) =>
      service.technician
        ? (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center">
              <RiUserStarLine className="h-3 w-3 text-sky-500" />
            </div>
            <span className="font-medium text-sm">{service.technician.name}</span>
          </div>
        )
        : (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-muted/50 flex items-center justify-center">
              <RiUserLine className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Unassigned</span>
          </div>
        ),
  },

  invoice: {
    key: "invoice",
    header: "Invoice",
    render: (service) => {
      if (!service.invoice) return <span className="text-muted-foreground">-</span>;
      const isPaid = service.invoice.paymentStatus === "paid";
      const isDp = service.invoice.paymentStatus === "dp";
      const invoiceTotal = getInvoiceDisplayTotal(service);
    return (
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex flex-col">
          <span className="text-sm font-semibold tabular-nums">{formatCurrency(invoiceTotal.netTotal)}</span>
          {invoiceTotal.totalRefund > 0 && (
            <span className="text-[0.6rem] text-muted-foreground">Asli {formatCurrency(invoiceTotal.originalTotal)}</span>
          )}
        </div>
          <div className="flex items-center gap-1">
            {isPaid && <RiCheckLine className="h-3 w-3 text-chart-1" />}
            <Badge variant={getPaymentStatusColor(service.invoice.paymentStatus)} className="text-[0.6rem]">
              {isPaid ? "Paid" : isDp ? `DP${service.invoice.dpAmount ? " " + formatCurrency(service.invoice.dpAmount) : ""}` : "Unpaid"}
            </Badge>
            {invoiceTotal.totalRefund > 0 && <Badge variant="outline" className="text-[0.6rem]">Refund</Badge>}
          </div>
        </div>
      );
    },
    width: 100,
  },

  checkinAt: {
    key: "checkinAt",
    header: "Check-in / Out",
    render: (service) => (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <RiInboxArchiveLine className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground/80">Check-in</span>
          <span className="text-xs text-muted-foreground">{formatDate(service.checkinAt)}</span>
        </div>
        {service.checkoutAt && (
          <div className="flex items-center gap-2">
            <RiInboxUnarchiveLine className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground/80">Check-out</span>
            <span className="text-xs text-muted-foreground">{formatDate(service.checkoutAt)}</span>
          </div>
        )}
      </div>
    ),
    width: 150,
  },

  doneAt: {
    key: "doneAt",
    header: "Completed At",
    render: (service) => (
      <div className="flex items-center gap-2">
        <RiCheckDoubleLine className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs text-muted-foreground">{formatDate(service.doneAt)}</span>
      </div>
    ),
    width: 120,
  },

};

export type ColumnKey = keyof typeof columnRegistry;
