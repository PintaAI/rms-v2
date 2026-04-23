import type { ItemType, PaymentStatus, ServiceStatus } from "@/prisma/generated/prisma/enums";

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
  note: string | null;
  status: ServiceStatus;
  isPickedUp?: boolean;
  checkinAt: Date;
  doneAt: Date | null;
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
  } | null;
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
