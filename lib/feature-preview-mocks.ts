import type { KaryawanItem, KaryawanStats } from "@/actions/karyawan";
import type { SparepartWithCompatibilities, ServicePricelist } from "@/actions/inventory";
import type { AdminAnalyticsData } from "@/actions/analytics";
import type { StaffOverviewData } from "@/actions/overview";
import type { FeatureKey, SubscriptionPlan } from "@/lib/features";
import type { InventoryAuditOverview } from "@/components/dashboard/inventory/audit-gudang/types";

export const planLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  premium: "Pro",
  enterprise: "Enterprise",
};

export const MOCK_KARYAWAN: KaryawanItem[] = [
  {
    id: "mock-1",
    name: "Budi Santoso",
    email: "budi@tokoexample.com",
    role: "staff",
    createdAt: new Date("2024-01-15"),
    performance: { servicesCreated: 45, servicesCompleted: 0, servicesFailed: 0 },
  },
  {
    id: "mock-2",
    name: "Sari Dewi",
    email: "sari@tokoexample.com",
    role: "technician",
    createdAt: new Date("2024-02-20"),
    performance: { servicesCreated: 0, servicesCompleted: 38, servicesFailed: 3 },
  },
  {
    id: "mock-3",
    name: "Ahmad Rizki",
    email: "ahmad@tokoexample.com",
    role: "technician",
    createdAt: new Date("2024-03-10"),
    performance: { servicesCreated: 0, servicesCompleted: 52, servicesFailed: 5 },
  },
];

export const MOCK_KARYAWAN_STATS: KaryawanStats = {
  staff: 1,
  technician: 2,
  total: 3,
};

export const MOCK_SPAREPARTS: SparepartWithCompatibilities[] = [
  {
    id: "mock-sp-1",
    barcode: "LCD-IP11",
    name: "LCD iPhone 11",
    defaultPrice: 350000,
    purchasePrice: 280000,
    supplierName: "Supplier Preview A",
    categoryId: "mock-cat-lcd",
    stock: 15,
    criticalStock: 3,
    isUniversal: false,
    kind: "sparepart",
    tokoId: "mock",
    category: { id: "mock-cat-lcd", name: "LCD", tokoId: "mock" },
    compatibilities: [
      { hpCatalogId: "mock-hp-1", hpCatalog: { id: "mock-hp-1", modelName: "iPhone 11", brand: { name: "Apple" } } },
    ],
  },
  {
    id: "mock-sp-2",
    barcode: "BAT-SAM-A50",
    name: "Battery Samsung A50",
    defaultPrice: 150000,
    purchasePrice: 95000,
    supplierName: "Supplier Preview B",
    categoryId: "mock-cat-battery",
    stock: 8,
    criticalStock: 5,
    isUniversal: false,
    kind: "sparepart",
    tokoId: "mock",
    category: { id: "mock-cat-battery", name: "Baterai", tokoId: "mock" },
    compatibilities: [
      { hpCatalogId: "mock-hp-2", hpCatalog: { id: "mock-hp-2", modelName: "Galaxy A50", brand: { name: "Samsung" } } },
    ],
  },
  {
    id: "mock-sp-3",
    barcode: "CHG-USBC",
    name: "Charging Port USB-C",
    defaultPrice: 50000,
    purchasePrice: 25000,
    supplierName: "Supplier Preview C",
    categoryId: "mock-cat-connector",
    stock: 25,
    criticalStock: 10,
    isUniversal: true,
    kind: "sparepart",
    tokoId: "mock",
    category: { id: "mock-cat-connector", name: "Konektor", tokoId: "mock" },
    compatibilities: [],
  },
];

export const MOCK_PRICELISTS: ServicePricelist[] = [
  { id: "mock-pl-1", title: "Ganti LCD", defaultPrice: 75000 },
  { id: "mock-pl-2", title: "Ganti Baterai", defaultPrice: 50000 },
  { id: "mock-pl-3", title: "Service Software", defaultPrice: 100000 },
];

export const MOCK_ANALYTICS_DATA: AdminAnalyticsData = {
  toko: { id: "mock", name: "Toko Example", logoUrl: null },
  filters: { from: "2026-01-01", to: "2026-06-30" },
  bucketMode: "month",
  periodLabel: "Jan - Jun 2026",
  summary: {
    paidRevenue: 23300000,
    pendingRevenue: 4500000,
    paidInvoices: 415,
    averagePaidInvoice: 56144,
    totalServices: 500,
    completionRate: 0.78,
    totalSpareparts: 150,
    lowStockCount: 12,
    totalStock: 3200,
  },
  trend: [
    { key: "2026-01", label: "Jan", revenue: 2500000, pending: 800000, services: 45, completed: 35 },
    { key: "2026-02", label: "Feb", revenue: 3200000, pending: 600000, services: 58, completed: 48 },
    { key: "2026-03", label: "Mar", revenue: 4100000, pending: 900000, services: 72, completed: 58 },
    { key: "2026-04", label: "Apr", revenue: 3800000, pending: 700000, services: 65, completed: 52 },
    { key: "2026-05", label: "May", revenue: 4500000, pending: 750000, services: 80, completed: 62 },
    { key: "2026-06", label: "Jun", revenue: 5200000, pending: 750000, services: 95, completed: 78 },
  ],
  statusBreakdown: [
    { status: "received", label: "Masuk", count: 45 },
    { status: "repairing", label: "Proses", count: 65 },
    { status: "done", label: "Selesai", count: 333 },
    { status: "failed", label: "Gagal", count: 57 },
  ],
  topTechnicians: [
    { id: "mock-tech-1", name: "Ahmad Rizki", completedServices: 52, revenue: 7800000 },
    { id: "mock-tech-2", name: "Sari Dewi", completedServices: 38, revenue: 5900000 },
  ],
  topSpareparts: [
    { id: "mock-sp-1", name: "LCD iPhone 11", qty: 18, revenue: 6300000 },
    { id: "mock-sp-2", name: "Battery Samsung A50", qty: 14, revenue: 2100000 },
  ],
};

export const MOCK_STAFF_OVERVIEW_DATA: StaffOverviewData = {
  stats: {
    services: {
      total: 50,
      repairing: 8,
      done: 35,
      daily: 5,
      weekly: 28,
    },
    inventory: {
      lowStockCount: 5,
    },
  },
  recentServices: [
    {
      id: "mock-svc-1",
      customerName: "Andi Pratama",
      noWa: "081234567890",
      complaint: "LCD retak",
      status: "done",
      isPickedUp: false,
      checkinAt: new Date("2026-05-28"),
      doneAt: new Date("2026-05-30"),
      warrantyUntil: new Date("2026-06-30"),
      checkoutAt: null,
      hpCatalog: { id: "mock-hp-1", modelName: "iPhone 11", brand: { name: "Apple" } },
      technician: { id: "mock-tech-1", name: "Ahmad Rizki" },
      invoice: { id: "mock-inv-1", grandTotal: 450000, paymentStatus: "paid", dpAmount: 0 },
    },
    {
      id: "mock-svc-2",
      customerName: "Budi Santoso",
      noWa: "081987654321",
      complaint: "Baterai cepat habis",
      status: "repairing",
      isPickedUp: false,
      checkinAt: new Date("2026-06-01"),
      doneAt: null,
      warrantyUntil: null,
      checkoutAt: null,
      hpCatalog: { id: "mock-hp-2", modelName: "Galaxy A50", brand: { name: "Samsung" } },
      technician: { id: "mock-tech-2", name: "Sari Dewi" },
      invoice: { id: "mock-inv-2", grandTotal: 200000, paymentStatus: "dp", dpAmount: 50000 },
    },
    {
      id: "mock-svc-3",
      customerName: "Citra Dewi",
      noWa: "081555666777",
      complaint: "Charging port longgar",
      status: "received",
      isPickedUp: false,
      checkinAt: new Date("2026-06-02"),
      doneAt: null,
      warrantyUntil: null,
      checkoutAt: null,
      hpCatalog: { id: "mock-hp-3", modelName: "Xiaomi Note 12", brand: { name: "Xiaomi" } },
      technician: null,
      invoice: null,
    },
  ],
};

export const MOCK_AUDIT_OVERVIEW: InventoryAuditOverview = {
  activeSession: null,
  recentSessions: [
    {
      id: "mock-audit-ses-1",
      tokoId: "mock",
      createdById: "mock-user",
      status: "completed",
      startedAt: new Date("2026-05-20"),
      completedAt: new Date("2026-05-20"),
      cancelledAt: null,
      createdBy: { id: "mock-user", name: "Admin Toko" },
      items: [],
      summary: {
        totalItems: 45,
        countedItems: 45,
        pendingItems: 0,
        matchedItems: 40,
        discrepancyItems: 5,
        missingQty: 3,
        excessQty: 2,
        differenceValue: 175000,
        potentialLostValue: 150000,
      },
    },
  ],
};

export const FEATURE_PREVIEW_INFO: Partial<
  Record<FeatureKey, { title: string; description: string; benefits: string[]; previewType: "staff" | "sparepart" | "revenue" | "audit" }>
> = {
  "staff.workflow": {
    title: "Staff Workflow",
    description: "Dashboard operasional staff untuk monitoring service, inventory, dan aktivitas toko.",
    benefits: [
      "Lihat ringkasan service harian dan mingguan",
      "Pantau stok inventory dengan low stock alert",
      "Akses cepat ke service management",
      "Tracking aktivitas operasional toko",
    ],
    previewType: "revenue",
  },
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
    title: "Enterprise Analytics",
    description: "Pantau performa toko dari revenue, service, teknisi, dan inventory dalam satu dashboard.",
    benefits: [
      "Filter analytics dengan date range, preset periode, dan status service",
      "Trend revenue paid dan pending harian",
      "Service completion rate dan distribusi status",
      "Ranking teknisi dan sinyal kesehatan inventory",
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
  "realtime.updates": {
    title: "Realtime Update",
    description: "Dashboard, activity log, dan status service tersinkron otomatis antar perangkat.",
    benefits: [
      "Update service langsung terlihat di perangkat lain",
      "Activity log terbaru ikut refresh otomatis",
      "Mengurangi refresh manual saat operasional ramai",
      "Status koneksi realtime terlihat di header dashboard",
    ],
    previewType: "revenue",
  },
  "realtime.mobileScanner": {
    title: "Scan via HP",
    description: "Gunakan kamera HP sebagai scanner barcode sparepart yang terhubung ke desktop.",
    benefits: [
      "Pairing cepat lewat QR code",
      "Scan barcode sparepart tanpa scanner fisik",
      "Cocok untuk input item service dan restock inventory",
      "Bisa dimatikan dari pengaturan fitur toko",
    ],
    previewType: "sparepart",
  },
};
