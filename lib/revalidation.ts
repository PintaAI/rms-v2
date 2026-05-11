import { revalidatePath } from "next/cache";

export function revalidateServicePaths(tokoId: string, includeTeknisi = false): void {
  revalidatePath(`/${tokoId}/admin/service`);
  revalidatePath(`/${tokoId}/admin`);
  if (includeTeknisi) {
    revalidatePath(`/${tokoId}/teknisi/task`);
  }
}

export function revalidateInventoryPaths(tokoId?: string, includeStaff = true): void {
  if (!tokoId) {
    revalidatePath("/dashboard/admin/inventory");
    if (includeStaff) {
      revalidatePath("/dashboard/staff/sparepart");
    }
    return;
  }

  revalidatePath(`/${tokoId}/admin/inventory`);
  revalidatePath(`/${tokoId}/admin/inventory/audit-gudang`);
  revalidatePath(`/${tokoId}/admin`);
  if (includeStaff) {
    revalidatePath(`/${tokoId}/staff/inventory`);
    revalidatePath(`/${tokoId}/teknisi/inventory`);
  }
}

export function revalidateRetailPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/admin/retail`);
  revalidatePath(`/${tokoId}/staff/retail`);
  revalidatePath(`/${tokoId}/admin/inventory/retail`);
  revalidateInventoryPaths(tokoId);
}

export function revalidateTokoPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/admin/toko`);
  revalidatePath(`/${tokoId}/admin`);
}

export function revalidateKaryawanPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/admin/karyawan`);
}
