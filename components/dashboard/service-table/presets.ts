import type { ColumnKey, PresetKey } from "./types";

export const columnPresets: Record<PresetKey, ColumnKey[]> = {
  adminActive: [
    "customer",
    "device",
    "complaint",
    "createdBy",
    "status",
    "technician",
    "invoice",
    "checkinAt",
  ],
  staffActive: [
    "customer",
    "device",
    "complaint",
    "note",
    "createdBy",
    "status",
    "invoice",
    "checkinAt",
  ],
  technicianAvailable: ["customer", "device", "complaint", "note", "status"],
  technicianMyTasks: [
    "customer",
    "device",
    "complaint",
    "note",
    "status",
    "invoice",
  ],
  completed: [
    "customer",
    "device",
    "complaint",
    "note",
    "status",
    "technician",
    "invoice",
    "doneAt",
  ],
  history: [
    "customer",
    "device",
    "complaint",
    "note",
    "status",
    "technician",
    "invoice",
    "doneAt",
    "checkoutAt",
  ],
};

export function resolvePreset(preset: PresetKey): { columns: ColumnKey[] } {
  return { columns: columnPresets[preset] || columnPresets.adminActive };
}