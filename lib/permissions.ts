import type { FeatureKey } from "@/lib/features";
import type { UserRole } from "@/lib/auth/request-user";

export type PermissionCategory =
  | "inventory"
  | "service_catalog_item"
  | "retail"
  | "karyawan"
  | "analytics"
  | "whatsapp"
  | "toko"
  | "features"
  | "supplier_returns"
  | "supplier_debts"
  | "warranty"
  | "dashboard";

export type PermissionSensitivity =
  | "operational"
  | "sensitive"
  | "ownership";

export type PermissionEffect = "allow" | "deny";

export type PermissionMetadata = {
  label: string;
  description: string;
  inactiveReason?: string;
  category: PermissionCategory;
  requiredFeature: FeatureKey | null;
  grantableInV1: boolean;
  sensitivity: PermissionSensitivity;
};

export const PERMISSION_REGISTRY = {
  // Inventory
  "inventory.view": {
    label: "Lihat inventory",
    description: "Dapat melihat item inventory dan level stok.",
    inactiveReason: "Karyawan tidak dapat membuka dan melihat data inventory toko.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.create": {
    label: "Buat item inventory",
    description: "Dapat membuat item inventory baru.",
    inactiveReason: "Karyawan tidak dapat menambahkan item inventory baru.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.update": {
    label: "Ubah item inventory",
    description: "Dapat mengubah data dan harga item inventory.",
    inactiveReason: "Karyawan tidak dapat mengubah data, harga, atau detail item inventory.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.delete": {
    label: "Hapus item inventory",
    description: "Dapat menghapus item inventory dari katalog.",
    inactiveReason: "Karyawan tidak dapat menghapus item inventory dari katalog.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.restock": {
    label: "Restock inventory",
    description: "Dapat menambah stok dan mencatat stok masuk.",
    inactiveReason: "Karyawan tidak dapat menambah stok atau mencatat stok masuk.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.import": {
    label: "Import inventory",
    description: "Dapat import massal item inventory dan daftar harga jasa.",
    inactiveReason: "Karyawan tidak dapat melakukan import massal inventory atau daftar harga jasa.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.viewHistory": {
    label: "Lihat history inventory",
    description: "Dapat melihat history stok masuk dan restock.",
    inactiveReason: "Karyawan tidak dapat melihat history stok masuk atau restock.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.report": {
    label: "Lihat laporan inventory",
    description: "Dapat melihat data laporan inventory.",
    inactiveReason: "Karyawan tidak dapat membuka laporan inventory.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.manageServicePricelists": {
    label: "Kelola daftar harga jasa",
    description: "Dapat membuat, mengubah, import, dan menghapus daftar harga jasa.",
    inactiveReason: "Karyawan tidak dapat membuat, mengubah, import, atau menghapus daftar harga jasa.",
    category: "inventory",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.audit": {
    label: "Audit inventory",
    description: "Dapat menjalankan audit stok fisik dan koreksi stok.",
    inactiveReason: "Karyawan tidak dapat menjalankan audit stok fisik atau koreksi stok.",
    category: "inventory",
    requiredFeature: "inventory.audit",
    grantableInV1: true,
    sensitivity: "sensitive",
  },

  // Service
  "service.view": {
    label: "Lihat service",
    description: "Dapat melihat data service dan halaman detail service.",
    inactiveReason: "Karyawan tidak dapat membuka daftar atau detail service.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "service.create": {
    label: "Buat service",
    description: "Dapat membuat data service baru.",
    inactiveReason: "Karyawan tidak dapat membuat data service baru.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "service.update": {
    label: "Ubah service",
    description: "Dapat mengubah detail service.",
    inactiveReason: "Karyawan tidak dapat mengubah detail service.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "service.updateStatus": {
    label: "Ubah status service",
    description: "Dapat memindahkan service antar status operasional.",
    inactiveReason: "Karyawan tidak dapat memindahkan service antar status operasional.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "service.delete": {
    label: "Hapus service",
    description: "Dapat menghapus data service yang masih boleh dihapus.",
    inactiveReason: "Karyawan tidak dapat menghapus data service.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "service.pickup": {
    label: "Tandai service diambil",
    description: "Dapat menandai service selesai sebagai sudah diambil customer.",
    inactiveReason: "Karyawan tidak dapat menandai service selesai sebagai sudah diambil customer.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "service.assignTechnician": {
    label: "Tugaskan teknisi",
    description: "Dapat assign teknisi ke data service.",
    inactiveReason: "Karyawan tidak dapat menugaskan teknisi ke data service.",
    category: "service_catalog_item",
    requiredFeature: "service.technicianAssignment",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "service.takeOverTask": {
    label: "Ambil alih task service",
    description: "Dapat mengambil task teknisi yang belum di-assign.",
    inactiveReason: "Karyawan tidak dapat mengambil task teknisi yang belum di-assign.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "service.createInvoice": {
    label: "Buat invoice service",
    description: "Dapat membuat invoice dari data service.",
    inactiveReason: "Karyawan tidak dapat membuat invoice dari data service.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "service.manageItems": {
    label: "Kelola item service",
    description: "Dapat menambah atau menghapus inventoryItem dan jasa pada invoice service.",
    inactiveReason: "Karyawan tidak dapat menambah atau menghapus inventoryItem dan jasa pada invoice service.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "service.manageInvoice": {
    label: "Kelola invoice service",
    description: "Dapat mengubah item dan total invoice service.",
    inactiveReason: "Karyawan tidak dapat mengubah item atau total invoice service.",
    category: "service_catalog_item",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },

  // Retail
  "retail.view": {
    label: "Lihat retail",
    description: "Dapat mengakses halaman penjualan retail.",
    inactiveReason: "Karyawan tidak dapat membuka halaman penjualan retail.",
    category: "retail",
    requiredFeature: "retail.sales",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "retail.sell": {
    label: "Jual item retail",
    description: "Dapat membuat transaksi penjualan retail.",
    inactiveReason: "Karyawan tidak dapat membuat transaksi penjualan retail.",
    category: "retail",
    requiredFeature: "retail.sales",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "retail.viewHistory": {
    label: "Lihat history retail",
    description: "Dapat melihat history transaksi retail.",
    inactiveReason: "Karyawan tidak dapat melihat history transaksi retail.",
    category: "retail",
    requiredFeature: "retail.sales",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "inventory.manageRetail": {
    label: "Kelola retail inventory",
    description: "Dapat membuat, mengubah, dan menghapus barang retail di inventory.",
    inactiveReason: "Karyawan tidak dapat mengelola barang retail inventory.",
    category: "retail",
    requiredFeature: "retail.sales",
    grantableInV1: true,
    sensitivity: "operational",
  },

  // Supplier returns
  "supplier_returns.view": {
    label: "Lihat retur supplier",
    description: "Dapat melihat daftar retur supplier dan status prosesnya.",
    inactiveReason: "Karyawan tidak dapat melihat retur supplier.",
    category: "supplier_returns",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "supplier_returns.create": {
    label: "Buat retur supplier",
    description: "Dapat membuat data retur supplier dari inventoryItem atau klaim garansi.",
    inactiveReason: "Karyawan tidak dapat membuat retur supplier.",
    category: "supplier_returns",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "supplier_returns.update": {
    label: "Ubah retur supplier",
    description: "Dapat mengirim, refund, menolak, atau memperbarui status retur supplier.",
    inactiveReason: "Karyawan tidak dapat mengubah status retur supplier.",
    category: "supplier_returns",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "supplier_returns.resolve": {
    label: "Selesaikan retur supplier",
    description: "Dapat menyelesaikan retur supplier dengan penggantian stok.",
    inactiveReason: "Karyawan tidak dapat menyelesaikan retur supplier.",
    category: "supplier_returns",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },

  // Supplier debts
  "supplier_debts.view": {
    label: "Lihat hutang supplier",
    description: "Dapat melihat data supplier dan hutang supplier.",
    inactiveReason: "Karyawan tidak dapat melihat data supplier dan hutang supplier.",
    category: "supplier_debts",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "supplier_debts.create": {
    label: "Buat hutang supplier",
    description: "Dapat membuat data supplier dan hutang supplier.",
    inactiveReason: "Karyawan tidak dapat membuat data supplier atau hutang supplier.",
    category: "supplier_debts",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "supplier_debts.update": {
    label: "Ubah hutang supplier",
    description: "Dapat mengubah detail hutang supplier.",
    inactiveReason: "Karyawan tidak dapat mengubah detail hutang supplier.",
    category: "supplier_debts",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "supplier_debts.delete": {
    label: "Hapus hutang supplier",
    description: "Dapat menghapus data hutang supplier yang belum dibayar.",
    inactiveReason: "Karyawan tidak dapat menghapus hutang supplier.",
    category: "supplier_debts",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "supplier_debts.pay": {
    label: "Bayar hutang supplier",
    description: "Dapat mencatat pembayaran hutang supplier.",
    inactiveReason: "Karyawan tidak dapat mencatat pembayaran hutang supplier.",
    category: "supplier_debts",
    requiredFeature: "inventory.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },

  // Warranty
  "warranty.create": {
    label: "Buat klaim warranty",
    description: "Dapat membuat klaim warranty untuk service yang sudah selesai.",
    inactiveReason: "Karyawan tidak dapat membuat klaim warranty untuk service yang sudah selesai.",
    category: "warranty",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },
  "warranty.resolve": {
    label: "Selesaikan klaim warranty",
    description: "Dapat menyelesaikan klaim warranty, termasuk repair, refund, atau penggantian.",
    inactiveReason: "Karyawan tidak dapat menyelesaikan klaim warranty.",
    category: "warranty",
    requiredFeature: "service.management",
    grantableInV1: true,
    sensitivity: "operational",
  },

  // Karyawan
  "karyawan.view": {
    label: "Lihat karyawan",
    description: "Dapat melihat daftar dan profil karyawan.",
    inactiveReason: "Karyawan tidak dapat membuka daftar atau profil karyawan toko.",
    category: "karyawan",
    requiredFeature: "karyawan.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "karyawan.create": {
    label: "Buat karyawan",
    description: "Dapat mengundang atau membuat user staff dan teknisi.",
    inactiveReason: "Karyawan tidak dapat membuat akun staff atau teknisi baru.",
    category: "karyawan",
    requiredFeature: "karyawan.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "karyawan.update": {
    label: "Ubah karyawan",
    description: "Dapat mengubah profil dan role karyawan.",
    inactiveReason: "Karyawan tidak dapat mengubah profil atau role karyawan.",
    category: "karyawan",
    requiredFeature: "karyawan.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "karyawan.deactivate": {
    label: "Nonaktifkan karyawan",
    description: "Dapat menonaktifkan user staff dan teknisi.",
    inactiveReason: "Karyawan tidak dapat menonaktifkan akun staff atau teknisi.",
    category: "karyawan",
    requiredFeature: "karyawan.management",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "karyawan.managePermissions": {
    label: "Kelola permission karyawan",
    description: "Dapat memberi atau mencabut permission untuk user toko.",
    category: "karyawan",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "ownership",
  },

  // Analytics
  "analytics.view": {
    label: "Lihat analytics",
    description: "Dapat melihat analytics revenue, service, teknisi, dan inventory.",
    inactiveReason: "Karyawan tidak dapat membuka analytics toko.",
    category: "analytics",
    requiredFeature: "analytics.revenue",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "analytics.export": {
    label: "Export analytics",
    description: "Dapat export data analytics.",
    category: "analytics",
    requiredFeature: "analytics.revenue",
    grantableInV1: false,
    sensitivity: "sensitive",
  },

  // Dashboard/search
  "dashboard.view": {
    label: "Lihat dashboard",
    description: "Dapat melihat data overview dashboard sesuai role.",
    inactiveReason: "Karyawan tidak dapat melihat overview dashboard.",
    category: "dashboard",
    requiredFeature: null,
    grantableInV1: true,
    sensitivity: "operational",
  },
  "dashboard.search": {
    label: "Cari dashboard",
    description: "Dapat menggunakan global search dashboard pada module yang dapat diakses.",
    inactiveReason: "Karyawan tidak dapat menggunakan global search dashboard.",
    category: "dashboard",
    requiredFeature: null,
    grantableInV1: true,
    sensitivity: "operational",
  },

  // WhatsApp
  "whatsapp.view": {
    label: "Lihat pengaturan WhatsApp",
    description: "Dapat melihat halaman integrasi WhatsApp.",
    inactiveReason: "Karyawan tidak dapat melihat halaman integrasi WhatsApp.",
    category: "whatsapp",
    requiredFeature: "whatsapp.integration",
    grantableInV1: true,
    sensitivity: "sensitive",
  },
  "whatsapp.send": {
    label: "Kirim pesan WhatsApp",
    description: "Dapat mengirim notifikasi service via WhatsApp.",
    category: "whatsapp",
    requiredFeature: "whatsapp.integration",
    grantableInV1: false,
    sensitivity: "sensitive",
  },
  "whatsapp.manageTemplates": {
    label: "Kelola template WhatsApp",
    description: "Dapat membuat dan mengubah template pesan WhatsApp.",
    category: "whatsapp",
    requiredFeature: "whatsapp.integration",
    grantableInV1: false,
    sensitivity: "sensitive",
  },
  "whatsapp.manageSettings": {
    label: "Kelola pengaturan WhatsApp",
    description: "Dapat connect, disconnect, atau mengatur provider WhatsApp.",
    category: "whatsapp",
    requiredFeature: "whatsapp.integration",
    grantableInV1: false,
    sensitivity: "ownership",
  },

  // Toko
  "toko.viewSettings": {
    label: "Lihat pengaturan toko",
    description: "Dapat melihat profil dan pengaturan toko.",
    category: "toko",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "sensitive",
  },
  "toko.updateProfile": {
    label: "Ubah profil toko",
    description: "Dapat mengubah detail profil toko.",
    category: "toko",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "sensitive",
  },
  "toko.manageOperational": {
    label: "Kelola operasional toko",
    description: "Dapat mengelola pengaturan operasional toko.",
    category: "toko",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "sensitive",
  },
  "toko.create": {
    label: "Buat toko",
    description: "Dapat membuat data toko yang dimiliki admin saat ini.",
    category: "toko",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "ownership",
  },
  "toko.delete": {
    label: "Hapus toko",
    description: "Dapat menghapus data toko.",
    category: "toko",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "ownership",
  },

  // Ownership guardrails
  "features.manage": {
    label: "Kelola pengaturan feature",
    description: "Dapat mengaktifkan atau menonaktifkan feature untuk toko.",
    category: "features",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "ownership",
  },
  "features.view": {
    label: "Lihat pengaturan feature",
    description: "Dapat melihat status pengaturan feature toko.",
    category: "features",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "ownership",
  },
  "toko.manageOwnership": {
    label: "Kelola ownership toko",
    description: "Dapat transfer atau menghapus ownership toko.",
    category: "toko",
    requiredFeature: null,
    grantableInV1: false,
    sensitivity: "ownership",
  },
} as const satisfies Record<string, PermissionMetadata>;

export type PermissionKey = keyof typeof PERMISSION_REGISTRY;

export type PermissionOverrideInput = {
  permissionKey: PermissionKey;
  effect: PermissionEffect;
};

export type PermissionLockReason =
  | "missing_permission"
  | "feature_unavailable"
  | "unknown_permission";

export type PermissionAccess = {
  allowed: boolean;
  permissionKey: PermissionKey;
  requiredFeature: FeatureKey | null;
  lockReason: PermissionLockReason | null;
};

export type PermissionAccessMap = Record<PermissionKey, PermissionAccess>;

export const ROLE_DEFAULT_PERMISSIONS = {
  admin: [
    "inventory.view",
    "inventory.create",
    "inventory.update",
    "inventory.delete",
    "inventory.restock",
    "inventory.import",
    "inventory.viewHistory",
    "inventory.report",
    "inventory.manageServicePricelists",
    "inventory.audit",
    "service.view",
    "service.create",
    "service.update",
    "service.updateStatus",
    "service.delete",
    "service.pickup",
    "service.assignTechnician",
    "service.takeOverTask",
    "service.createInvoice",
    "service.manageItems",
    "service.manageInvoice",
    "retail.view",
    "retail.sell",
    "retail.viewHistory",
    "inventory.manageRetail",
    "supplier_returns.view",
    "supplier_returns.create",
    "supplier_returns.update",
    "supplier_returns.resolve",
    "supplier_debts.view",
    "supplier_debts.create",
    "supplier_debts.update",
    "supplier_debts.delete",
    "supplier_debts.pay",
    "warranty.create",
    "warranty.resolve",
    "karyawan.view",
    "karyawan.create",
    "karyawan.update",
    "karyawan.deactivate",
    "karyawan.managePermissions",
    "analytics.view",
    "analytics.export",
    "dashboard.view",
    "dashboard.search",
    "whatsapp.view",
    "whatsapp.send",
    "whatsapp.manageTemplates",
    "whatsapp.manageSettings",
    "toko.viewSettings",
    "toko.updateProfile",
    "toko.manageOperational",
    "toko.create",
    "toko.delete",
    "features.manage",
    "features.view",
    "toko.manageOwnership",
  ],
  staff: [
    "inventory.view",
    "inventory.viewHistory",
    "inventory.report",
    "service.view",
    "service.create",
    "service.update",
    "service.updateStatus",
    "service.delete",
    "service.pickup",
    "service.assignTechnician",
    "service.createInvoice",
    "service.manageItems",
    "service.manageInvoice",
    "retail.view",
    "retail.sell",
    "retail.viewHistory",
    "warranty.create",
    "warranty.resolve",
    "dashboard.view",
    "dashboard.search",
  ],
  technician: [
    "inventory.view",
    "inventory.viewHistory",
    "inventory.report",
    "service.view",
    "service.update",
    "service.updateStatus",
    "service.manageItems",
    "dashboard.view",
    "dashboard.search",
  ],
  superuser: [
    "inventory.view",
    "inventory.create",
    "inventory.update",
    "inventory.delete",
    "inventory.restock",
    "inventory.import",
    "inventory.viewHistory",
    "inventory.report",
    "inventory.manageServicePricelists",
    "inventory.audit",
    "service.view",
    "service.create",
    "service.update",
    "service.updateStatus",
    "service.delete",
    "service.pickup",
    "service.assignTechnician",
    "service.takeOverTask",
    "service.createInvoice",
    "service.manageItems",
    "service.manageInvoice",
    "retail.view",
    "retail.sell",
    "retail.viewHistory",
    "inventory.manageRetail",
    "supplier_returns.view",
    "supplier_returns.create",
    "supplier_returns.update",
    "supplier_returns.resolve",
    "supplier_debts.view",
    "supplier_debts.create",
    "supplier_debts.update",
    "supplier_debts.delete",
    "supplier_debts.pay",
    "warranty.create",
    "warranty.resolve",
    "karyawan.view",
    "karyawan.create",
    "karyawan.update",
    "karyawan.deactivate",
    "karyawan.managePermissions",
    "analytics.view",
    "analytics.export",
    "dashboard.view",
    "dashboard.search",
    "whatsapp.view",
    "whatsapp.send",
    "whatsapp.manageTemplates",
    "whatsapp.manageSettings",
    "toko.viewSettings",
    "toko.updateProfile",
    "toko.manageOperational",
    "toko.create",
    "toko.delete",
    "features.manage",
    "features.view",
    "toko.manageOwnership",
  ],
} as const satisfies Record<UserRole, readonly PermissionKey[]>;

export function isPermissionKey(value: string): value is PermissionKey {
  return Object.prototype.hasOwnProperty.call(PERMISSION_REGISTRY, value);
}

export function getPermissionMetadata(
  permissionKey: PermissionKey,
): PermissionMetadata {
  return PERMISSION_REGISTRY[permissionKey];
}

export function getPermissionInactiveReason(permissionKey: PermissionKey): string {
  const metadata = getPermissionMetadata(permissionKey);

  return metadata.inactiveReason ?? `${metadata.label} tidak aktif untuk karyawan ini.`;
}

export function getPermissionsByCategory(
  category: PermissionCategory,
): PermissionKey[] {
  return (Object.keys(PERMISSION_REGISTRY) as PermissionKey[]).filter(
    (key) => PERMISSION_REGISTRY[key].category === category,
  );
}

export function getGrantablePermissionsInV1(): PermissionKey[] {
  return (Object.keys(PERMISSION_REGISTRY) as PermissionKey[]).filter(
    (key) => PERMISSION_REGISTRY[key].grantableInV1,
  );
}

export function getRoleDefaultPermissions(
  role: UserRole,
): readonly PermissionKey[] {
  return ROLE_DEFAULT_PERMISSIONS[role];
}

export function getNonGrantablePermissions(): PermissionKey[] {
  return (Object.keys(PERMISSION_REGISTRY) as PermissionKey[]).filter(
    (key) => !PERMISSION_REGISTRY[key].grantableInV1,
  );
}

export function getEffectivePermissionKeys(
  role: UserRole,
  overrides: readonly PermissionOverrideInput[],
): Set<PermissionKey> {
  const permissions = new Set<PermissionKey>(ROLE_DEFAULT_PERMISSIONS[role]);

  for (const override of overrides) {
    if (override.effect === "allow") {
      permissions.add(override.permissionKey);
    } else {
      permissions.delete(override.permissionKey);
    }
  }

  return permissions;
}

export function hasEffectivePermission(
  role: UserRole,
  overrides: readonly PermissionOverrideInput[],
  permissionKey: PermissionKey,
): boolean {
  return getEffectivePermissionKeys(role, overrides).has(permissionKey);
}

export type FeatureAvailabilityLookup = (featureKey: FeatureKey) => boolean;

export function computePermissionAccess(
  role: UserRole,
  overrides: readonly PermissionOverrideInput[],
  permissionKey: PermissionKey,
  isFeatureAvailable: FeatureAvailabilityLookup,
): PermissionAccess {
  const metadata = PERMISSION_REGISTRY[permissionKey];
  const effective = getEffectivePermissionKeys(role, overrides);

  if (!effective.has(permissionKey)) {
    return {
      allowed: false,
      permissionKey,
      requiredFeature: metadata.requiredFeature,
      lockReason: "missing_permission",
    };
  }

  if (
    metadata.requiredFeature !== null
    && !isFeatureAvailable(metadata.requiredFeature)
  ) {
    return {
      allowed: false,
      permissionKey,
      requiredFeature: metadata.requiredFeature,
      lockReason: "feature_unavailable",
    };
  }

  return {
    allowed: true,
    permissionKey,
    requiredFeature: metadata.requiredFeature,
    lockReason: null,
  };
}

export function computeAllPermissionAccess(
  role: UserRole,
  overrides: readonly PermissionOverrideInput[],
  isFeatureAvailable: FeatureAvailabilityLookup,
): PermissionAccessMap {
  const keys = Object.keys(PERMISSION_REGISTRY) as PermissionKey[];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      computePermissionAccess(role, overrides, key, isFeatureAvailable),
    ]),
  ) as PermissionAccessMap;
}
