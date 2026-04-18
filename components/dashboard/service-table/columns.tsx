"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getBrandIcon } from "@/lib/brand-icons";
import { RiUserStarLine, RiUserLine, RiCheckLine } from "@remixicon/react";
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
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <RiUserLine className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="font-medium">{service.customerName || "-"}</span>
        <span className="text-xs text-muted-foreground">{service.noWa}</span>
      </div>
    </div>
  );
}

export function renderDeviceCell(service: ServiceTableItem): React.ReactNode {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        {getBrandIcon(service.hpCatalog.brand.name)}
      </div>
      <div>
        <div className="font-medium">{service.hpCatalog.brand.name}</div>
        <div className="text-xs text-muted-foreground">{service.hpCatalog.modelName}</div>
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

export function renderNoteCell(service: ServiceTableItem): React.ReactNode {
  if (!service.note) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger className="block max-w-xs truncate text-left cursor-default">
        {service.note}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        {service.note}
      </TooltipContent>
    </Tooltip>
  );
}

export function renderCreatedByCell(service: ServiceTableItem): React.ReactNode {
  if (service.createdBy?.name) {
    return (
      <Badge variant="default">
        <RiUserStarLine className="h-3 w-3 mr-1" />
        {service.createdBy.name}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <RiUserLine className="h-3 w-3 mr-1" />
      Unknown
    </Badge>
  );
}

export function renderStatusCell(service: ServiceTableItem): React.ReactNode {
  const StatusIcon = getStatusIcon(service.status);
  return (
    <Badge variant={getStatusColor(service.status)}>
      {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
      {getStatusLabel(service.status)}
    </Badge>
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
      <Badge variant="default">
        <RiUserStarLine className="h-3 w-3 mr-1" />
        {service.technician.name}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <RiUserLine className="h-3 w-3 mr-1" />
      Unassigned
    </Badge>
  );
}

export function renderInvoiceCell(service: ServiceTableItem): React.ReactNode {
  if (!service.invoice) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium">{formatCurrency(service.invoice.grandTotal)}</span>
      <Badge
        variant={getPaymentStatusColor(service.invoice.paymentStatus)}
        className="w-fit mt-1"
      >
        {service.invoice.paymentStatus === "paid" && <RiCheckLine className="h-3 w-3 mr-1" />}
        {service.invoice.paymentStatus}
      </Badge>
    </div>
  );
}

export function renderCheckinAtCell(service: ServiceTableItem): React.ReactNode {
  return <span className="text-muted-foreground">{formatDate(service.checkinAt)}</span>;
}

export function renderDoneAtCell(service: ServiceTableItem): React.ReactNode {
  return <span className="text-muted-foreground">{formatDate(service.doneAt)}</span>;
}

export function renderCheckoutAtCell(service: ServiceTableItem): React.ReactNode {
  return <span className="text-muted-foreground">{formatDate(service.checkoutAt)}</span>;
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