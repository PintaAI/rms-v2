"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  RiMoreLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiWhatsappLine,
  RiCheckLine,
  RiMoneyDollarCircleLine,
  RiTaskLine,
  RiUserStarLine,
  RiUserLine,
} from "@remixicon/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InvoiceDialog, isPaidInvoiceService, type InvoicePreviewService } from "./invoice-dialog";
import { TechnicianDropdown } from "./technician-dropdown";
import { columnRegistry, type ColumnContext, type ColumnKey } from "./column-registry";
import { resolveColumns, type RoleKey } from "./presets";
import { formatWhatsApp, getStatusColor } from "./utils";
import type { ServiceTableItem } from "./types";

export interface ServiceTableProps {
  services: ServiceTableItem[];
  role?: RoleKey;
  columnsOverride?: ColumnKey[];
  pickedUpFilter?: boolean;
  statusFilter?: string;
  emptyMessage?: string;
  onEdit?: (service: ServiceTableItem) => void;
  onDelete?: (service: ServiceTableItem) => void;
  onAssignTech?: (service: ServiceTableItem) => void;
  onMarkPaid?: (invoiceId: string, serviceId: string) => void;
  onCall?: (phone: string, service: ServiceTableItem) => void;
  onPickup?: (serviceId: string) => void;
  onTake?: (serviceId: string) => void;
  onRowClick?: (service: ServiceTableItem) => void;
  tokoId?: string;
  disableAssignment?: boolean;
}

export function ServiceTable({
  services,
  role = "admin",
  columnsOverride,
  pickedUpFilter,
  statusFilter,
  emptyMessage = "No services found",
  onEdit,
  onDelete,
  onAssignTech,
  onMarkPaid,
  onCall,
  onPickup,
  onTake,
  onRowClick,
  tokoId,
  disableAssignment,
}: ServiceTableProps) {
  const context: ColumnContext = { pickedUpFilter, statusFilter, isHistory: statusFilter === "done,failed" };
  const effectiveColumns = columnsOverride || resolveColumns(role, context);

  const showDropdownActions = onEdit || onDelete;
  const showCompletedActions = onCall || onPickup;
  const showMarkPaid = onMarkPaid;
  const showTakeTask = onTake;
  const hasActions = showDropdownActions || showCompletedActions || showMarkPaid || showTakeTask;

  const getEmptyColSpan = () => effectiveColumns.length + (hasActions ? 1 : 0);

  const [selectedInvoiceService, setSelectedInvoiceService] = React.useState<InvoicePreviewService | null>(null);

  const openInvoiceDialog = React.useCallback((service: ServiceTableItem) => {
    if (!isPaidInvoiceService(service)) return;
    setSelectedInvoiceService(service);
  }, [setSelectedInvoiceService]);

  const handleCallClick = (phone: string, service: ServiceTableItem) => {
    const formattedPhone = formatWhatsApp(phone);
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
    onCall?.(phone, service);
  };

  const getRowStatusClass = (statusColor: ReturnType<typeof getStatusColor>) => {
    switch (statusColor) {
      case "success": return "bg-green-500/[0.04] hover:bg-green-500/[0.08]";
      case "accent": return "bg-sky-500/[0.04] hover:bg-sky-500/[0.08]";
      case "destructive": return "bg-destructive/[0.04] hover:bg-destructive/[0.08]";
      case "secondary": return "bg-muted/25 hover:bg-muted/35";
      default: return "bg-border/10 hover:bg-border/20";
    }
  };

  const renderCell = (colKey: string, service: ServiceTableItem) => {
    if (colKey === "technician") {
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

    const columnDef = columnRegistry[colKey];
    if (!columnDef) return null;
    
    return columnDef.render(service);
  };

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            {effectiveColumns.map((colKey) => {
              const columnDef = columnRegistry[colKey as keyof typeof columnRegistry];
              return (
                <TableHead key={colKey} className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground h-9">
                  {columnDef?.header || colKey}
                </TableHead>
              );
            })}
            {hasActions && (
              <TableHead className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={getEmptyColSpan()} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            services.map((service) => {
              const statusColor = getStatusColor(service.status);
              const indicatorClass =
                statusColor === "success" ? "bg-green-500/60 group-hover:bg-green-500" :
                statusColor === "accent" ? "bg-sky-500/60 group-hover:bg-sky-500" :
                statusColor === "destructive" ? "bg-destructive/60 group-hover:bg-destructive" :
                statusColor === "secondary" ? "bg-muted-foreground/40 group-hover:bg-muted-foreground/60" :
                "bg-border group-hover:bg-border/80";

              return (
                <TableRow
                  key={service.id}
                  className={`group transition-all duration-200 ${getRowStatusClass(statusColor)} ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(service)}
                >
                  {effectiveColumns.map((colKey, index) => (
                    <TableCell key={colKey} className={index === 0 ? "relative pl-4" : ""}>
                      {index === 0 && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorClass} rounded-full transition-all duration-200 group-hover:w-1.5`} />
                      )}
                      {(() => {
                        const cellContent = renderCell(colKey, service);
                        
                        if (colKey !== "invoice" || !service.invoice) return cellContent;
                        
                        const isPaidInvoice = service.invoice.paymentStatus === "paid";
                        if (!isPaidInvoice) return cellContent;

                        return (
                          <button
                            type="button"
                            className="w-full rounded-xl p-1 -m-1 text-left transition hover:bg-emerald-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                            onClick={(event) => {
                              event.stopPropagation();
                              openInvoiceDialog(service);
                            }}
                          >
                            {cellContent}
                          </button>
                        );
                      })()}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {onTake && (service.status === "received" || service.status === "repairing") && (
                          (() => {
                            const isTakeover = Boolean(service.technician && service.technician.id);
                            return (
                              <Button
                                size="sm"
                                className={isTakeover ? "h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm" : "h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"}
                                onClick={(e) => { e.stopPropagation(); onTake(service.id); }}
                              >
                                <RiTaskLine className="h-3.5 w-3.5 mr-1" />
                                {service.technician ? "Takeover" : "Ambil"}
                              </Button>
                            );
                          })()
                        )}
                        {showMarkPaid && service.invoice?.paymentStatus === "unpaid" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-chart-1 hover:bg-chart-1/80 text-primary-foreground shadow-sm"
                            onClick={(e) => { e.stopPropagation(); onMarkPaid!(service.invoice!.id, service.id); }}
                          >
                            <RiMoneyDollarCircleLine className="h-3.5 w-3.5 mr-1" />
                            Bayar
                          </Button>
                        )}
                        {onCall && (
                          <Button
                            size="sm"
                            className="h-7 border border-green-200 bg-green-100 text-xs text-green-700 hover:bg-green-200 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-950/60"
                            onClick={(e) => { e.stopPropagation(); handleCallClick(service.noWa, service); }}
                          >
                            <RiWhatsappLine className="h-3.5 w-3.5 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                        {onPickup && !service.isPickedUp && (service.status === "done" || service.status === "failed") && (
                          <Button
                            size="sm"
                            className="h-7 text-xs shadow-sm bg-muted/60 text-foreground hover:bg-muted/80 dark:bg-muted/30 dark:hover:bg-muted/50"
                            onClick={(e) => { e.stopPropagation(); onPickup(service.id); }}
                          >
                            <RiCheckLine className="h-3.5 w-3.5 mr-1" />
                            Picked up
                          </Button>
                        )}
                        {showDropdownActions && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                                <RiMoreLine className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[120px]">
                              {onEdit && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(service); }}>
                                  <RiPencilLine className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {onDelete && service.invoice?.paymentStatus !== "paid" && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={(e) => { e.stopPropagation(); onDelete(service); }}
                                >
                                  <RiDeleteBinLine className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <InvoiceDialog
        service={selectedInvoiceService}
        open={Boolean(selectedInvoiceService)}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoiceService(null);
        }}
      />
    </TooltipProvider>
  );
}
