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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  RiSettings3Line,
  RiPencilLine,
  RiDeleteBinLine,
  RiTaskLine,
  RiUserStarLine,
  RiUserLine,
  RiPrinterLine,
} from "@remixicon/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InvoiceDialog, type InvoicePreviewService } from "./invoice-dialog";
import { TechnicianDropdown } from "./technician-dropdown";
import { columnRegistry, type ColumnKey } from "./column-registry";
import { resolveColumns, type RoleKey } from "./presets";
import { getStatusColor } from "./utils";
import type { ServiceTableItem } from "./types";

const PREFERENCES_VERSION = 1;
const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 420;
const ACTION_COLUMN_WIDTH = 120;
const PREFERENCES_CHANGE_EVENT = "service-table-preferences-change";
const preferencesCache = new Map<string, { raw: string | null; preferences: ServiceTablePreferences }>();

type ServiceTablePreferences = {
  version: typeof PREFERENCES_VERSION;
  hiddenColumns: ColumnKey[];
  widths: Partial<Record<ColumnKey, number>>;
};

const defaultPreferences: ServiceTablePreferences = {
  version: PREFERENCES_VERSION,
  hiddenColumns: [],
  widths: {},
};

function isColumnKey(value: string): value is ColumnKey {
  return value in columnRegistry;
}

function sanitizePreferences(value: unknown): ServiceTablePreferences {
  if (!value || typeof value !== "object") return defaultPreferences;

  const candidate = value as Partial<ServiceTablePreferences>;
  if (candidate.version !== PREFERENCES_VERSION) return defaultPreferences;

  const hiddenColumns = Array.isArray(candidate.hiddenColumns)
    ? candidate.hiddenColumns.filter((column): column is ColumnKey => typeof column === "string" && isColumnKey(column))
    : [];

  const widths = Object.entries(candidate.widths || {}).reduce<Partial<Record<ColumnKey, number>>>((acc, [key, width]) => {
    if (isColumnKey(key) && typeof width === "number" && Number.isFinite(width)) {
      acc[key] = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width));
    }
    return acc;
  }, {});

  return { version: PREFERENCES_VERSION, hiddenColumns, widths };
}

function readPreferences(storageKey: string): ServiceTablePreferences {
  if (typeof window === "undefined") return defaultPreferences;

  try {
    const raw = window.localStorage.getItem(storageKey);
    const cached = preferencesCache.get(storageKey);
    if (cached?.raw === raw) return cached.preferences;

    const preferences = raw ? sanitizePreferences(JSON.parse(raw)) : defaultPreferences;
    preferencesCache.set(storageKey, { raw, preferences });
    return preferences;
  } catch {
    window.localStorage.removeItem(storageKey);
    preferencesCache.set(storageKey, { raw: null, preferences: defaultPreferences });
    return defaultPreferences;
  }
}

function useServiceTablePreferences(storageKey: string) {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    window.addEventListener(PREFERENCES_CHANGE_EVENT, onStoreChange);
    window.addEventListener("storage", onStoreChange);

    return () => {
      window.removeEventListener(PREFERENCES_CHANGE_EVENT, onStoreChange);
      window.removeEventListener("storage", onStoreChange);
    };
  }, []);

  const getSnapshot = React.useCallback(() => readPreferences(storageKey), [storageKey]);
  const preferences = React.useSyncExternalStore(subscribe, getSnapshot, () => defaultPreferences);

  const setPreferences = React.useCallback((updater: React.SetStateAction<ServiceTablePreferences>) => {
    const current = readPreferences(storageKey);
    const next = typeof updater === "function" ? updater(current) : updater;

    window.localStorage.setItem(storageKey, JSON.stringify(sanitizePreferences(next)));
    window.dispatchEvent(new Event(PREFERENCES_CHANGE_EVENT));
  }, [storageKey]);

  const resetPreferences = React.useCallback(() => {
    window.localStorage.removeItem(storageKey);
    window.dispatchEvent(new Event(PREFERENCES_CHANGE_EVENT));
  }, [storageKey]);

  return { preferences, setPreferences, resetPreferences };
}

export interface ServiceTableProps {
  services: ServiceTableItem[];
  role?: RoleKey;
  columnsOverride?: ColumnKey[];
  headerTitle?: string;
  headerDescription?: React.ReactNode;
  headerBadge?: React.ReactNode;
  showHeader?: boolean;
  statusFilter?: string;
  emptyMessage?: string;
  onEdit?: (service: ServiceTableItem) => void;
  onDelete?: (service: ServiceTableItem) => void;
  onAssignTech?: (service: ServiceTableItem) => void;
  onTake?: (serviceId: string) => void;
  onRowClick?: (service: ServiceTableItem) => void;
  tokoId?: string;
  hideTechnicianColumn?: boolean;
}

export function ServiceTable({
  services,
  role = "admin",
  columnsOverride,
  headerTitle = "Daftar Service",
  headerDescription,
  headerBadge,
  showHeader = true,
  statusFilter,
  emptyMessage = "No services found",
  onEdit,
  onDelete,
  onAssignTech,
  onTake,
  onRowClick,
  tokoId,
  hideTechnicianColumn,
}: ServiceTableProps) {
  const defaultColumns = React.useMemo(
    () => columnsOverride || resolveColumns(role),
    [columnsOverride, role]
  );
  const filteredColumns = React.useMemo(
    () => hideTechnicianColumn ? defaultColumns.filter((col) => col !== "technician") : defaultColumns,
    [defaultColumns, hideTechnicianColumn]
  );
  const storageKey = React.useMemo(() => {
    const viewKey = statusFilter || "all";
    return `service-table:${role}:${viewKey}`;
  }, [role, statusFilter]);
  const { preferences, setPreferences, resetPreferences } = useServiceTablePreferences(storageKey);
  const effectiveColumns = React.useMemo(() => {
    const visibleColumns = filteredColumns.filter((column) => !preferences.hiddenColumns.includes(column));
    if (visibleColumns.length > 0) return visibleColumns;
    return filteredColumns.includes("customer") ? ["customer"] : filteredColumns.slice(0, 1);
  }, [filteredColumns, preferences.hiddenColumns]);

  const showRowActions = true;
  const showTakeTask = onTake;
  const hasActions = showRowActions || showTakeTask;

  const getEmptyColSpan = () => effectiveColumns.length + (hasActions ? 1 : 0);

  const [selectedInvoiceService, setSelectedInvoiceService] = React.useState<InvoicePreviewService | null>(null);

  const toggleColumn = React.useCallback((column: ColumnKey) => {
    if (column === "customer") return;

    setPreferences((current) => {
      const hiddenColumns = current.hiddenColumns.includes(column)
        ? current.hiddenColumns.filter((hiddenColumn) => hiddenColumn !== column)
        : [...current.hiddenColumns, column];

      return { ...current, hiddenColumns };
    });
  }, [setPreferences]);

  const getColumnWidth = React.useCallback((column: ColumnKey) => {
    return preferences.widths[column] ?? columnRegistry[column]?.width ?? 120;
  }, [preferences.widths]);

  const tableWidth = React.useMemo(() => {
    const columnWidth = effectiveColumns.reduce((total, colKey) => total + getColumnWidth(colKey), 0);
    return columnWidth + (hasActions ? ACTION_COLUMN_WIDTH : 0);
  }, [effectiveColumns, getColumnWidth, hasActions]);

  const startColumnResize = React.useCallback((event: React.PointerEvent, column: ColumnKey, nextColumn: ColumnKey) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = getColumnWidth(column);
    const startNextWidth = getColumnWidth(nextColumn);
    const pairWidth = startWidth + startNextWidth;
    const minWidth = Math.max(MIN_COLUMN_WIDTH, pairWidth - MAX_COLUMN_WIDTH);
    const maxWidth = Math.min(MAX_COLUMN_WIDTH, pairWidth - MIN_COLUMN_WIDTH);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + moveEvent.clientX - startX));

      setPreferences((current) => ({
        ...current,
        widths: { ...current.widths, [column]: nextWidth, [nextColumn]: pairWidth - nextWidth },
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }, [getColumnWidth, setPreferences]);

  const openInvoiceDialog = React.useCallback((service: ServiceTableItem) => {
    setSelectedInvoiceService(service);
  }, [setSelectedInvoiceService]);

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
      if (onAssignTech && tokoId) {
        return (
          <TechnicianDropdown
            service={service}
            tokoId={tokoId}
            onAssignmentChange={() => onAssignTech(service)}
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
          <span className="text-sm text-muted-foreground">Belum Ada Teknisi</span>
        </div>
      );
    }

    const columnDef = columnRegistry[colKey];
    if (!columnDef) return null;
    
    return columnDef.render(service);
  };

  const columnSettingsDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Atur kolom tabel">
          <RiSettings3Line className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Kolom tabel</DropdownMenuLabel>
        <DropdownMenuGroup>
          {filteredColumns.map((colKey) => {
            const columnDef = columnRegistry[colKey];
            const isRequired = colKey === "customer";

            return (
              <DropdownMenuCheckboxItem
                key={colKey}
                checked={!preferences.hiddenColumns.includes(colKey)}
                disabled={isRequired}
                onCheckedChange={() => toggleColumn(colKey)}
                onSelect={(event) => event.preventDefault()}
              >
                {columnDef?.header || colKey}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={resetPreferences}>
            Restore default
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <TooltipProvider>
      {showHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-border/50 bg-muted/30 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 min-h-5 w-1 self-stretch rounded-full bg-primary" />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-lg font-bold leading-tight">{headerTitle}</h3>
                {headerBadge !== undefined && headerBadge !== null && (
                  <span className="shrink-0 rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {headerBadge}
                  </span>
                )}
              </div>
              {headerDescription && (
                <p className="mt-1 text-sm text-muted-foreground/70">{headerDescription}</p>
              )}
            </div>
          </div>

          <div >
            {columnSettingsDropdown}
          </div>
        </div>
      )}

      {!showHeader && (
        <div className="flex items-center justify-end gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
          {columnSettingsDropdown}
        </div>
      )}

      <Table className="table-fixed" style={{ minWidth: tableWidth }}>
        <colgroup>
          {effectiveColumns.map((colKey) => (
            <col key={colKey} style={{ width: getColumnWidth(colKey) }} />
          ))}
          {hasActions && <col style={{ width: ACTION_COLUMN_WIDTH }} />}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            {effectiveColumns.map((colKey, index) => {
              const columnDef = columnRegistry[colKey as keyof typeof columnRegistry];
              const nextColumn = effectiveColumns[index + 1];
              return (
                <TableHead
                  key={colKey}
                  className="relative h-9 select-none text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground"
                  style={{ width: getColumnWidth(colKey), minWidth: getColumnWidth(colKey) }}
                >
                  <span className="block truncate pr-2">{columnDef?.header || colKey}</span>
                  {nextColumn && (
                    <span
                      aria-hidden="true"
                      className="absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 cursor-col-resize rounded-full bg-border transition-colors hover:bg-primary/60"
                      onPointerDown={(event) => startColumnResize(event, colKey, nextColumn)}
                    />
                  )}
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
                    <TableCell
                      key={colKey}
                      className={index === 0 ? "relative overflow-hidden truncate pl-4" : "overflow-hidden truncate"}
                      style={{ width: getColumnWidth(colKey), minWidth: getColumnWidth(colKey) }}
                    >
                      {index === 0 && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorClass} rounded-full transition-all duration-200 group-hover:w-1.5`} />
                      )}
                      {(() => {
                        const cellContent = (
                          <div className="min-w-0 overflow-hidden truncate">
                            {renderCell(colKey, service)}
                          </div>
                        );
                        
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
                      <div className="flex items-center gap-1">
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
                        {showRowActions && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-muted"
                              aria-label="Print nota"
                              title="Print nota"
                              onClick={(e) => { e.stopPropagation(); openInvoiceDialog(service); }}
                            >
                              <RiPrinterLine className="h-3.5 w-3.5" />
                            </Button>
                            {onEdit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-muted"
                                aria-label="Edit service"
                                title="Edit"
                                onClick={(e) => { e.stopPropagation(); onEdit(service); }}
                              >
                                <RiPencilLine className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {onDelete && service.invoice?.paymentStatus !== "paid" && service.invoice?.paymentStatus !== "dp" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Delete service"
                                title="Delete"
                                onClick={(e) => { e.stopPropagation(); onDelete(service); }}
                              >
                                <RiDeleteBinLine className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
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
