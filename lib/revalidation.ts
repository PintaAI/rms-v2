import { revalidatePath } from "next/cache";

export function revalidateServicePaths(storeId: string, includeTeknisi = false): void {
  revalidatePath(`/${storeId}/service`);
  revalidatePath(`/${storeId}/service/tasks`);
  revalidatePath(`/${storeId}/admin`);
  if (includeTeknisi) {
    revalidatePath(`/${storeId}/teknisi`);
  }
}

export function revalidateInventoryPaths(storeId?: string, includeStaff = true): void {
  if (!storeId) {
    revalidatePath("/dashboard");
    return;
  }

  revalidatePath(`/${storeId}/inventory`);
  revalidatePath(`/${storeId}/inventory/audit-gudang`);
  revalidatePath(`/${storeId}/inventory/reports`);
  revalidatePath(`/${storeId}/inventory/restock-history`);
  revalidatePath(`/${storeId}/inventory/supplier-returns`);
  revalidatePath(`/${storeId}/admin`);
  if (includeStaff) {
    revalidatePath(`/${storeId}/staff`);
    revalidatePath(`/${storeId}/teknisi`);
  }
}

export function revalidateRetailPaths(storeId: string): void {
  revalidatePath(`/${storeId}/retail`);
  revalidatePath(`/${storeId}/retail/history`);
  revalidateInventoryPaths(storeId);
}

export function revalidateTokoPaths(storeId: string): void {
  revalidatePath(`/${storeId}/admin/toko`);
  revalidatePath(`/${storeId}/admin`);
}

export function revalidateAnalyticsPaths(storeId: string): void {
  revalidatePath(`/${storeId}/analytics`);
  revalidatePath(`/${storeId}/admin`);
}

export function revalidateKaryawanPaths(storeId: string): void {
  revalidatePath(`/${storeId}/karyawan`);
  revalidatePath(`/${storeId}/admin`);
}
