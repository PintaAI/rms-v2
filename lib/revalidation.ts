import { revalidatePath } from "next/cache";

export function revalidateServicePaths(tokoId: string, includeTeknisi = false): void {
  revalidatePath(`/${tokoId}/service`);
  revalidatePath(`/${tokoId}/service/tasks`);
  revalidatePath(`/${tokoId}/admin`);
  if (includeTeknisi) {
    revalidatePath(`/${tokoId}/teknisi`);
  }
}

export function revalidateInventoryPaths(tokoId?: string, includeStaff = true): void {
  if (!tokoId) {
    revalidatePath("/dashboard");
    return;
  }

  revalidatePath(`/${tokoId}/inventory`);
  revalidatePath(`/${tokoId}/inventory/audit-gudang`);
  revalidatePath(`/${tokoId}/inventory/reports`);
  revalidatePath(`/${tokoId}/inventory/restock-history`);
  revalidatePath(`/${tokoId}/inventory/supplier-returns`);
  revalidatePath(`/${tokoId}/admin`);
  if (includeStaff) {
    revalidatePath(`/${tokoId}/staff`);
    revalidatePath(`/${tokoId}/teknisi`);
  }
}

export function revalidateRetailPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/retail`);
  revalidatePath(`/${tokoId}/retail/history`);
  revalidateInventoryPaths(tokoId);
}

export function revalidateTokoPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/admin/toko`);
  revalidatePath(`/${tokoId}/admin`);
}

export function revalidateAnalyticsPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/analytics`);
  revalidatePath(`/${tokoId}/admin`);
}

export function revalidateKaryawanPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/karyawan`);
  revalidatePath(`/${tokoId}/admin`);
}
