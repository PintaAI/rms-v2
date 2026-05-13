import type { ItemType, PaymentStatus, ServiceStatus, SupplierReturnStatus, WarrantyClaimResolution, WarrantyClaimStatus } from "@/prisma/generated/prisma/enums";

export type TimeFilter = "daily" | "weekly" | "monthly" | "all";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ActionResultWithData<T> extends ActionResult {
  data?: T;
}

export interface ServiceListItem {
  id: string;
  hpCatalogId: string;
  customerName: string | null;
  noWa: string;
  complaint: string;
  handlingNote: string | null;
  includedItems?: string[] | null;
  note: string | null;
  status: ServiceStatus;
  isPickedUp?: boolean;
  checkinAt: Date;
  doneAt: Date | null;
  warrantyUntil: Date | null;
  checkoutAt: Date | null;
  passwordPattern: string | null;
  imei: string | null;
  hpCatalog: {
    id: string;
    modelName: string;
    brand: { name: string };
  };
  technician: { id: string; name: string } | null;
  createdBy: { name: string } | undefined;
  invoice: {
    id: string;
    grandTotal: number;
    paymentStatus: PaymentStatus;
    dpAmount: number;
    discountAmount: number;
    paidAt: Date | null;
    createdAt: Date;
    items: InvoiceItem[];
  } | null;
  warrantyClaims?: WarrantyClaim[];
}

export interface ServiceDetail extends ServiceListItem {
  tokoId: string;
  items: ServiceItem[];
}

export interface ServiceItem {
  id: string;
  type: ItemType;
  name: string;
  qty: number;
  price: number;
  referenceId: string | null;
}

export interface InvoiceItem {
  id: string;
  type: ItemType;
  name: string;
  qty: number;
  price: number;
}

export interface WarrantyClaimItem {
  id: string;
  sparepartId: string | null;
  name: string;
  qty: number;
  price: number;
}

export interface WarrantyClaim {
  id: string;
  status: WarrantyClaimStatus;
  resolution: WarrantyClaimResolution | null;
  reason: string;
  customerNote: string | null;
  technicianNote: string | null;
  refundAmount: number;
  resolvedNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  createdBy: { name: string };
  resolvedBy: { name: string } | null;
  items: WarrantyClaimItem[];
  supplierReturns: Array<{
    id: string;
    status: SupplierReturnStatus;
  }>;
}

export interface ServiceStats {
  total: number;
  received: number;
  repairing: number;
  done: number;
  pickedUp: number;
  failed: number;
  history: number;
}

export interface TechnicianStats {
  monthlyAssigned: number;
  availableCount: number;
  inProgressCount: number;
  doneCount: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TechnicianDashboardData {
  stats: TechnicianStats;
  availableServices: ServiceListItem[];
  myTasks: ServiceDetail[];
}

export interface TechnicianTaskStats {
  tersedia: number;
  repairing: number;
  selesai: number;
  gagal: number;
  history: number;
  total: number;
}
