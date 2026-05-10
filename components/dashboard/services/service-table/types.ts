export type StatusKey = "received" | "repairing" | "done" | "failed";

export type PaymentStatusKey = "unpaid" | "dp" | "paid";

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
  handlingNote?: string | null;
  includedItems?: string[] | null;
  note?: string | null;
  status: StatusKey | string;
  isPickedUp?: boolean;
  checkinAt: Date;
  doneAt?: Date | null;
  warrantyUntil?: Date | string | null;
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
    dpAmount?: number;
    discountAmount?: number;
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
  warrantyClaims?: Array<{
    id: string;
    status: string;
    resolution: string | null;
    reason: string;
    customerNote: string | null;
    technicianNote: string | null;
    refundAmount: number;
    resolvedNote: string | null;
    createdAt: Date | string;
    resolvedAt: Date | string | null;
    createdBy: { name: string };
    resolvedBy: { name: string } | null;
    items: Array<{
      id: string;
      sparepartId: string | null;
      name: string;
      qty: number;
      price: number;
    }>;
  }>;
  createdBy?: { name: string };
  passwordPattern?: string | null;
  imei?: string | null;
}
