import type { FeatureKey, SubscriptionPlan } from "@/lib/features";

export const planLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  premium: "Premium",
  enterprise: "Enterprise",
};

export interface MockStaff {
  id: string;
  name: string;
  email: string;
  role: "staff" | "technician";
  status: "active" | "inactive";
  createdAt: string;
}

export interface MockSparepart {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
}

export interface MockRevenueData {
  month: string;
  revenue: number;
  services: number;
}

export interface MockAuditItem {
  id: string;
  sparepartName: string;
  expectedStock: number;
  actualStock: number;
  discrepancy: number;
}

export const MOCK_STAFF: MockStaff[] = [
  {
    id: "mock-1",
    name: "Budi Santoso",
    email: "budi@tokoexample.com",
    role: "staff",
    status: "active",
    createdAt: "2024-01-15",
  },
  {
    id: "mock-2",
    name: "Sari Dewi",
    email: "sari@tokoexample.com",
    role: "technician",
    status: "active",
    createdAt: "2024-02-20",
  },
  {
    id: "mock-3",
    name: "Ahmad Rizki",
    email: "ahmad@tokoexample.com",
    role: "technician",
    status: "active",
    createdAt: "2024-03-10",
  },
];

export const MOCK_SPAREPARTS: MockSparepart[] = [
  {
    id: "mock-sp-1",
    name: "LCD iPhone 11",
    category: "LCD",
    stock: 15,
    price: 350000,
  },
  {
    id: "mock-sp-2",
    name: "Battery Samsung A50",
    category: "Battery",
    stock: 8,
    price: 150000,
  },
  {
    id: "mock-sp-3",
    name: "Charging Port USB-C",
    category: "Port",
    stock: 25,
    price: 50000,
  },
];

export const MOCK_REVENUE_DATA: MockRevenueData[] = [
  { month: "Jan", revenue: 2500000, services: 45 },
  { month: "Feb", revenue: 3200000, services: 58 },
  { month: "Mar", revenue: 4100000, services: 72 },
  { month: "Apr", revenue: 3800000, services: 65 },
  { month: "May", revenue: 4500000, services: 80 },
  { month: "Jun", revenue: 5200000, services: 95 },
];

export const MOCK_AUDIT_ITEMS: MockAuditItem[] = [
  {
    id: "mock-audit-1",
    sparepartName: "LCD iPhone 11",
    expectedStock: 15,
    actualStock: 14,
    discrepancy: -1,
  },
  {
    id: "mock-audit-2",
    sparepartName: "Battery Samsung A50",
    expectedStock: 8,
    actualStock: 8,
    discrepancy: 0,
  },
  {
    id: "mock-audit-3",
    sparepartName: "Charging Port USB-C",
    expectedStock: 25,
    actualStock: 23,
    discrepancy: -2,
  },
];

export const FEATURE_PREVIEW_INFO: Partial<
  Record<FeatureKey, { title: string; description: string; benefits: string[]; previewType: "staff" | "sparepart" | "revenue" | "audit" }>
> = {
  "karyawan.management": {
    title: "Karyawan Management",
    description: "Kelola tim toko Anda - tambah staff dan teknisi untuk membantu operasional repair shop.",
    benefits: [
      "Tambah staff untuk input service dan kelola invoice",
      "Tambah teknisi untuk handle pekerjaan repair",
      "Assign role dan kontrol akses per user",
      "Monitor performa setiap karyawan",
    ],
    previewType: "staff",
  },
  "inventory.management": {
    title: "Inventory Management",
    description: "Kelola sparepart dan jasa - track stok, harga, dan penggunaan komponen.",
    benefits: [
      "Database sparepart dengan stok tracking",
      "Service pricelist untuk jasa standar",
      "Auto stock deduction saat digunakan di service",
      "Low stock alert dan reorder reminder",
    ],
    previewType: "sparepart",
  },
  "analytics.revenue": {
    title: "Revenue Analytics",
    description: "Pantau performa pendapatan toko - lihat trend, insight, dan metrik penting.",
    benefits: [
      "Monthly revenue tracking",
      "Service completion rate",
      "Top performing technicians",
      "Revenue per service category",
    ],
    previewType: "revenue",
  },
  "inventory.audit": {
    title: "Audit Gudang",
    description: "Jalankan audit stok fisik - compare expected vs actual stock untuk akurasi inventory.",
    benefits: [
      "Physical stock count vs system",
      "Identify discrepancy dan losses",
      "Adjust stock after audit",
      "Complete audit history",
    ],
    previewType: "audit",
  },
};