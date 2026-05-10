import type { ColumnKey } from "./column-registry";

type ColumnList = ColumnKey[];

export const ROLE_DEFAULT_COLUMNS: Record<string, ColumnList> = {
  admin: ["customer", "device", "complaint", "createdBy", "status", "technician", "invoice", "checkinAt"],
  staff: ["customer", "device", "complaint", "createdBy", "status", "technician", "invoice", "checkinAt"],
  technician: ["customer", "device", "complaint", "technician", "note", "status"],
  technicianMyTasks: ["customer", "device", "complaint", "note", "status"],
};

export type RoleKey = keyof typeof ROLE_DEFAULT_COLUMNS;

export function resolveColumns(role: RoleKey): ColumnList {
  const columns = [...ROLE_DEFAULT_COLUMNS[role]];
  return columns;
}
