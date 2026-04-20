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
  RiPhoneLine,
  RiCheckLine,
  RiMoneyDollarCircleLine,
  RiTaskLine,
} from "@remixicon/react";
import type { ServiceTableProps, ServiceTableItem, ColumnKey, ColumnConfig, ColumnsInput } from "./types";
import { columnHeaders, getColumnRenderer } from "./columns";
import { resolvePreset, columnPresets } from "./presets";
import { formatWhatsApp, getStatusColor } from "./utils";
import { TooltipProvider } from "@/components/ui/tooltip";

function normalizeColumns(columns?: ColumnsInput): ColumnKey[] {
  if (!columns) return [];
  if (typeof columns[0] === "string") {
    return columns as ColumnKey[];
  }
  return (columns as ColumnConfig[])
    .filter((c) => c.visible !== false)
    .map((c) => c.key);
}

export function ServiceTable({
  services,
  columns,
  preset,
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
  const presetConfig = preset ? resolvePreset(preset) : null;
  const normalizedColumns = normalizeColumns(columns);
  const effectiveColumns = normalizedColumns.length > 0
    ? normalizedColumns
    : presetConfig?.columns || columnPresets.adminActive;

  const showDropdownActions = onEdit || onDelete;
  const showCompletedActions = onCall || onPickup;
  const showMarkPaid = onMarkPaid;
  const showTakeTask = onTake;
  const hasActions = showDropdownActions || showCompletedActions || showMarkPaid || showTakeTask;

  const getEmptyColSpan = () => {
    return effectiveColumns.length + (hasActions ? 1 : 0);
  };

  const handleCallClick = (phone: string, service: ServiceTableItem) => {
    const formattedPhone = formatWhatsApp(phone);
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
    onCall?.(phone, service);
  };

return (
    <TooltipProvider>
      <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-border/50">
          {effectiveColumns.map((colKey) => (
            <TableHead key={colKey} className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground h-9">
              {columnHeaders[colKey]}
            </TableHead>
          ))}
          {hasActions && <TableHead className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>}
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
              statusColor === 'success' ? 'bg-green-500/60 group-hover:bg-green-500' :
              statusColor === 'accent' ? 'bg-sky-500/60 group-hover:bg-sky-500' :
              statusColor === 'destructive' ? 'bg-destructive/60 group-hover:bg-destructive' :
              statusColor === 'secondary' ? 'bg-muted-foreground/40 group-hover:bg-muted-foreground/60' :
              'bg-border group-hover:bg-border/80';
            return (
              <TableRow
                key={service.id}
                className={`
                  group transition-all duration-200
                  ${onRowClick ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/30"}
                `}
                onClick={() => onRowClick?.(service)}
              >
                {effectiveColumns.map((colKey, index) => (
                  <TableCell 
                    key={colKey}
                    className={index === 0 ? "relative pl-4" : ""}
                  >
                    {index === 0 && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorClass} rounded-full transition-all duration-200 group-hover:w-1.5`} />
                    )}
                    {getColumnRenderer(colKey, {
                      onAssignTech,
                      tokoId,
                      disableAssignment,
                    })(service)}
                  </TableCell>
                ))}
                {hasActions && (
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      {onTake && service.status === "received" && !service.technician && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-sm shadow-primary/10"
                          onClick={(e) => { e.stopPropagation(); onTake(service.id); }}
                        >
                          <RiTaskLine className="h-3.5 w-3.5 mr-1" />
                          Ambil
                        </Button>
                      )}
                      {showMarkPaid && service.invoice?.paymentStatus === "unpaid" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-success/30 bg-success/5 hover:bg-success/10 text-chart-1"
                          onClick={(e) => { e.stopPropagation(); onMarkPaid(service.invoice!.id, service.id); }}
                        >
                          <RiMoneyDollarCircleLine className="h-3.5 w-3.5 mr-1" />
                          Bayar
                        </Button>
                      )}
                      {onCall && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); handleCallClick(service.noWa, service); }}
                        >
                          <RiPhoneLine className="h-3.5 w-3.5 mr-1" />
                          Hubungi WhatsApp
                        </Button>
                      )}
                      {onPickup && (service.status === "done" || service.status === "failed") && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs bg-gradient-to-r from-primary to-primary/90"
                          onClick={(e) => { e.stopPropagation(); onPickup(service.id); }}
                        >
                          <RiCheckLine className="h-3.5 w-3.5 mr-1" />
                          Tandai Diambil
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
    </TooltipProvider>
  );
}