export type StatusKey = "received" | "repairing" | "done" | "picked_up" | "failed";

export type PaymentStatusKey = "unpaid" | "paid";

export type ColumnKey =
  | "customer"
  | "device"
  | "complaint"
  | "note"
  | "createdBy"
  | "status"
  | "technician"
  | "invoice"
  | "checkinAt"
  | "doneAt"
  | "checkoutAt";

export type ActionKey =
  | "edit"
  | "delete"
  | "assignTech"
  | "markPaid"
  | "call"
  | "pickup"
  | "rowClick";

export interface ColumnConfig {
  key: ColumnKey;
  header?: string;
  visible?: boolean;
  render?: (service: ServiceTableItem) => React.ReactNode;
}

export type ColumnsInput = ColumnKey[] | ColumnConfig[];

export type PresetKey =
  | "adminActive"
  | "staffActive"
  | "technicianAvailable"
  | "technicianMyTasks"
  | "completed"
  | "history";

export interface ServiceTableItem {
  id: string;
  hpCatalogId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  note?: string | null;
  status: StatusKey | string;
  checkinAt: Date;
  doneAt?: Date | null;
  checkoutAt?: Date | null;
  hpCatalog: {
    modelName: string;
    brand: {
      name: string;
    };
  };
  technician: {
    id?: string;
    name: string;
  } | null;
  invoice?: {
    id: string;
    grandTotal: number;
    paymentStatus: PaymentStatusKey | string;
  } | null;
  createdBy?: {
    name: string;
  };
  passwordPattern?: string | null;
  imei?: string | null;
}

export interface ServiceTableProps {
  services: ServiceTableItem[];
  columns?: ColumnsInput;
  preset?: PresetKey;
  emptyMessage?: string;
  onEdit?: (service: ServiceTableItem) => void;
  onDelete?: (service: ServiceTableItem) => void;
  onAssignTech?: (service: ServiceTableItem) => void;
  onMarkPaid?: (invoiceId: string, serviceId: string) => void;
  onCall?: (phone: string, service: ServiceTableItem) => void;
  onPickup?: (serviceId: string) => void;
  onRowClick?: (service: ServiceTableItem) => void;
  tokoId?: string;
  disableAssignment?: boolean;
}