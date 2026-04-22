"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getBrandIcon } from "@/lib/brand-icons";
import { RiUserStarLine, RiUserLine, RiCheckLine, RiCalendarLine, RiCheckDoubleLine, RiLogoutBoxLine } from "@remixicon/react";
import type { ServiceTableItem, ColumnKey } from "./types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, getPaymentStatusColor, getStatusIcon } from "./utils";
import { TechnicianDropdown } from "./technician-dropdown";

export interface ColumnRendererProps {
  onAssignTech?: (service: ServiceTableItem) => void;
  tokoId?: string;
  disableAssignment?: boolean;
}

export const columnHeaders: Record<ColumnKey, string> = {
  customer: "Customer",
  device: "Device",
  complaint: "Complaint",
  note: "Note",
  createdBy: "Created By",
  status: "Status",
  technician: "Technician",
  invoice: "Invoice",
  checkinAt: "Check-in",
  doneAt: "Completed At",
  checkoutAt: "Picked Up At",
};

export function renderCustomerCell(service: ServiceTableItem): React.ReactNode {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary transition-all duration-200">
        <RiUserLine className="h-4 w-4" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-semibold truncate">{service.customerName || "-"}</span>
        <span className="text-xs text-muted-foreground truncate">{service.noWa}</span>
      </div>
    </div>
  );
}

export function renderDeviceCell(service: ServiceTableItem): React.ReactNode {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-muted-foreground transition-all duration-200">
        {getBrandIcon(service.hpCatalog.brand.name)}
      </div>
      <div className="min-w-0">
        <div className="font-semibold truncate">{service.hpCatalog.brand.name}</div>
        <div className="text-xs text-muted-foreground truncate">{service.hpCatalog.modelName}</div>
      </div>
    </div>
  );
}

export function renderComplaintCell(service: ServiceTableItem): React.ReactNode {
  const text = service.complaint;
  return (
    <Tooltip>
      <TooltipTrigger className="block max-w-[100px] truncate text-left cursor-default">
        {text}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function parseNoteStatus(note: string) {
  const match = note.match(/^\{(GAGAL|BERHASIL)\}\s*/);

  if (!match) {
    return {
      label: null,
      note,
    };
  }

  const label = match[1];

  return {
    label,
    note: note.replace(/^\{(?:GAGAL|BERHASIL)\}\s*/, "").trim() || label,
  };
}

export function renderNoteCell(service: ServiceTableItem): React.ReactNode {
  if (!service.note) {
    return <span className="text-muted-foreground">-</span>;
  }

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
}

export function renderCreatedByCell(service: ServiceTableItem): React.ReactNode {
  if (service.createdBy?.name) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <RiUserStarLine className="h-3 w-3 text-primary" />
        </div>
        <span className="font-medium text-sm">{service.createdBy.name}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-lg bg-muted/50 flex items-center justify-center">
        <RiUserLine className="h-3 w-3 text-muted-foreground" />
      </div>
      <span className="text-sm text-muted-foreground">Unknown</span>
    </div>
  );
}

export function renderStatusCell(service: ServiceTableItem): React.ReactNode {
  const StatusIcon = getStatusIcon(service.status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={getStatusColor(service.status)}>
        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
        {getStatusLabel(service.status)}
      </Badge>
      {service.isPickedUp && <Badge variant="outline">Picked Up</Badge>}
    </div>
  );
}

export function renderTechnicianCell(
  service: ServiceTableItem,
  onAssignTech?: (service: ServiceTableItem) => void,
  tokoId?: string,
  disableAssignment?: boolean
): React.ReactNode {
  if (onAssignTech && tokoId && !disableAssignment) {
    return (
      <TechnicianDropdown
        service={service}
        tokoId={tokoId}
        onAssignmentChange={() => onAssignTech(service)}
        disableAssignment={disableAssignment}
      />
    );
  }

  if (service.technician) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center">
          <RiUserStarLine className="h-3 w-3 text-sky-500" />
        </div>
        <span className="font-medium text-sm">{service.technician.name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-lg bg-muted/50 flex items-center justify-center">
        <RiUserLine className="h-3 w-3 text-muted-foreground" />
      </div>
      <span className="text-sm text-muted-foreground">Unassigned</span>
    </div>
  );
}

export function renderInvoiceCell(service: ServiceTableItem): React.ReactNode {
  if (!service.invoice) {
    return <span className="text-muted-foreground">-</span>;
  }

  const isPaid = service.invoice.paymentStatus === "paid";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold tabular-nums">{formatCurrency(service.invoice.grandTotal)}</span>
      <div className="flex items-center gap-1">
        {isPaid && <RiCheckLine className="h-3 w-3 text-chart-1" />}
        <Badge
          variant={getPaymentStatusColor(service.invoice.paymentStatus)}
          className="text-[0.6rem]"
        >
          {isPaid ? "Paid" : "Unpaid"}
        </Badge>
      </div>
    </div>
  );
}

export function renderCheckinAtCell(service: ServiceTableItem): React.ReactNode {
  return (
    <div className="flex items-center gap-2">
      <RiCalendarLine className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{formatDate(service.checkinAt)}</span>
    </div>
  );
}

export function renderDoneAtCell(service: ServiceTableItem): React.ReactNode {
  return (
    <div className="flex items-center gap-2">
      <RiCheckDoubleLine className="h-3.5 w-3.5 text-green-600" />
      <span className="text-xs text-muted-foreground">{formatDate(service.doneAt)}</span>
    </div>
  );
}

export function renderCheckoutAtCell(service: ServiceTableItem): React.ReactNode {
  return (
    <div className="flex items-center gap-2">
      <RiLogoutBoxLine className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs text-muted-foreground">{formatDate(service.checkoutAt)}</span>
    </div>
  );
}

export function getColumnRenderer(
  key: ColumnKey,
  props?: ColumnRendererProps
): (service: ServiceTableItem) => React.ReactNode {
  switch (key) {
    case "customer":
      return renderCustomerCell;
    case "device":
      return renderDeviceCell;
    case "complaint":
      return renderComplaintCell;
    case "note":
      return renderNoteCell;
    case "createdBy":
      return renderCreatedByCell;
    case "status":
      return renderStatusCell;
    case "technician":
      return (s) => renderTechnicianCell(s, props?.onAssignTech, props?.tokoId, props?.disableAssignment);
    case "invoice":
      return renderInvoiceCell;
    case "checkinAt":
      return renderCheckinAtCell;
    case "doneAt":
      return renderDoneAtCell;
    case "checkoutAt":
      return renderCheckoutAtCell;
    default:
      return () => null;
  }
}
