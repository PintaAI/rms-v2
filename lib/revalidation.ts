import { revalidatePath } from "next/cache";

export function revalidateServicePaths(tokoId: string, includeTeknisi = false): void {
  revalidatePath(`/${tokoId}/admin/service`);
  revalidatePath(`/${tokoId}/admin`);
  if (includeTeknisi) {
    revalidatePath(`/${tokoId}/teknisi/task`);
  }
}

export function revalidateInventoryPaths(includeStaff = true): void {
  revalidatePath("/dashboard/admin/inventory");
  if (includeStaff) {
    revalidatePath("/dashboard/staff/sparepart");
  }
}

export function revalidateTokoPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/admin/toko`);
  revalidatePath(`/${tokoId}/admin`);
}

export function revalidateKaryawanPaths(tokoId: string): void {
  revalidatePath(`/${tokoId}/admin/karyawan`);
}