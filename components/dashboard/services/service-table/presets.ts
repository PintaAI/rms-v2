import type { ColumnKey, ColumnContext } from "./column-registry";

type ColumnList = ColumnKey[];

export const ROLE_DEFAULT_COLUMNS: Record<string, ColumnList> = {
  admin: ["customer", "device", "complaint", "createdBy", "status", "technician", "invoice", "checkinAt"],
  staff: ["customer", "device", "complaint", "createdBy", "status", "invoice", "checkinAt"],
  technician: ["customer", "device", "complaint", "technician", "note", "status"],
  technicianMyTasks: ["customer", "device", "complaint", "note", "status"],
};

export type RoleKey = keyof typeof ROLE_DEFAULT_COLUMNS;

export function resolveColumns(role: RoleKey, context?: ColumnContext): ColumnList {
  const columns = [...ROLE_DEFAULT_COLUMNS[role]];
  if (context?.isHistory) {
    if (!columns.includes("doneAt")) columns.push("doneAt");
    if (!columns.includes("checkoutAt")) columns.push("checkoutAt");
  } else if (context?.pickedUpFilter) {
    if (!columns.includes("checkoutAt")) columns.push("checkoutAt");
  }
  return columns;
}