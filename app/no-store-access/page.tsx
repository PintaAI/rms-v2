import { UserInfo } from "@/components/shared/user-info";

export default function NoStoreAccessPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 text-center">
      <div className="absolute right-4 top-4 z-10">
        <UserInfo />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold">Belum ada toko yang bisa diakses</h1>
        <p className="text-sm text-muted-foreground">
          Akun ini belum punya assignment toko. Hubungi admin untuk mendapatkan akses.
        </p>
      </div>
    </div>
  );
}
