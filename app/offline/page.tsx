import Link from "next/link";
import { RiRefreshLine, RiWifiOffLine } from "@remixicon/react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <RiWifiOffLine className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Anda sedang offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          RMS membutuhkan koneksi internet untuk memuat data terbaru. Periksa koneksi Anda lalu coba buka ulang aplikasi.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <RiRefreshLine className="h-4 w-4" aria-hidden="true" />
          Coba lagi
        </Link>
      </section>
    </main>
  );
}
