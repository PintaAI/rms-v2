/**
 * ServiceTable - Public API
 *
 * Components:
 *   - ServiceTable: Main table component with configurable columns and actions
 *
 * Types:
 *   - ServiceTableItem: Data shape for table rows
 *   - RoleKey: Role identifiers for column baseline ("admin", "staff", "technician", "technicianMyTasks")
 *
 * Internal modules (not exported):
 *   - column-registry.tsx: Column definitions and renderers
 *   - presets.ts: Role-based default columns + resolution logic
 *   - utils.ts: Formatting helpers
 *   - invoice-dialog.tsx: Invoice preview modal
 *   - technician-dropdown.tsx: Assignment dropdown
 *   - types.ts: Internal type definitions
 */

export { ServiceTable } from "./service-table";
export type { ServiceTableItem } from "./types";
export type { RoleKey } from "./presets";