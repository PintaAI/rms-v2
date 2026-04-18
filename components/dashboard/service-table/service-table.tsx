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
} from "@remixicon/react";
import type { ServiceTableProps, ServiceTableItem, ColumnKey, ColumnConfig, ColumnsInput } from "./types";
import { columnHeaders, getColumnRenderer } from "./columns";
import { resolvePreset, columnPresets } from "./presets";
import { formatWhatsApp } from "./utils";
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
  const hasActions = showDropdownActions || showCompletedActions || showMarkPaid;

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
        <TableRow>
          {effectiveColumns.map((colKey) => (
            <TableHead key={colKey}>{columnHeaders[colKey]}</TableHead>
          ))}
          {hasActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.length === 0 ? (
          <TableRow>
            <TableCell colSpan={getEmptyColSpan()} className="h-24 text-center">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          services.map((service) => (
            <TableRow
              key={service.id}
              className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onRowClick?.(service)}
            >
              {effectiveColumns.map((colKey) => (
                <TableCell key={colKey}>
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
                    {showMarkPaid && service.invoice?.paymentStatus === "unpaid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onMarkPaid(service.invoice!.id, service.id); }}
                      >
                        <RiMoneyDollarCircleLine className="h-4 w-4 mr-1" />
                        Bayar
                      </Button>
                    )}
                    {onCall && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleCallClick(service.noWa, service); }}
                      >
                        <RiPhoneLine className="h-4 w-4 mr-1" />
                        whatsapp
                      </Button>
                    )}
                    {onPickup && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onPickup(service.id); }}
                      >
                        <RiCheckLine className="h-4 w-4 mr-1" />
                        Diambil
                      </Button>
                    )}
                    {showDropdownActions && (
                      <DropdownMenu>
<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                           <Button variant="ghost" size="icon">
                             <RiMoreLine className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {onEdit && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(service); }}>
                              <RiPencilLine className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && service.invoice?.paymentStatus !== "paid" && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => { e.stopPropagation(); onDelete(service); }}
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
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
          ))
        )}
      </TableBody>
      </Table>
    </TooltipProvider>
  );
}