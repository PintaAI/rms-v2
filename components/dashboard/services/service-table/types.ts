export type StatusKey = "received" | "repairing" | "done" | "failed";

export type PaymentStatusKey = "unpaid" | "paid";

export type PresetKey =
  | "adminActive"
  | "adminCompleted"
  | "adminHistory"
  | "staffActive"
  | "staffCompleted"
  | "staffHistory"
  | "technicianAvailable"
  | "technicianMyTasks"
  | "minimal"
  | "full";

export interface ServiceTableItem {
  id: string;
  hpCatalogId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  note?: string | null;
  status: StatusKey | string;
  isPickedUp?: boolean;
  checkinAt: Date;
  doneAt?: Date | null;
  checkoutAt?: Date | null;
  hpCatalog: {
    modelName: string;
    brand: { name: string };
  };
  technician: { id?: string; name: string } | null;
  invoice?: {
    id: string;
    grandTotal: number;
    paymentStatus: PaymentStatusKey | string;
    invoiceNumber?: string | null;
    createdAt?: Date | string | null;
    paidAt?: Date | string | null;
    items?: Array<{
      id?: string;
      type?: string | null;
      name: string;
      qty: number;
      price: number;
    }> | null;
  } | null;
  createdBy?: { name: string };
  passwordPattern?: string | null;
  imei?: string | null;
}