import type { Metadata } from "next";
import Link from "next/link";
import {
  RiArrowRightLine,
  RiBarChartBoxLine,
  RiCheckDoubleLine,
  RiCompass3Line,
  RiFlashlightLine,
  RiFoldersLine,
  RiPulseLine,
  RiQrCodeLine,
  RiShieldCheckLine,
  RiSmartphoneLine,
  RiStore2Line,
  RiTeamLine,
} from "@remixicon/react";
import { ModeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth";

const features = [
  {
    icon: RiSmartphoneLine,
    title: "Service ticket super cepat",
    description:
      "Catat perangkat, keluhan, IMEI, password, dan kontak pelanggan dalam satu alur yang rapi.",
  },
  {
    icon: RiFoldersLine,
    title: "Inventory dan jasa per toko",
    description:
      "Sparepart, pricelist jasa, dan stok dipisahkan per toko supaya operasional tetap presisi.",
  },
  {
    icon: RiTeamLine,
    title: "Workflow tim yang jelas",
    description:
      "Admin, staff, dan teknisi punya jalur kerja yang berbeda tanpa tumpang tindih akses.",
  },
  {
    icon: RiPulseLine,
    title: "Status servis mudah dipantau",
    description:
      "Pantau ticket dari masuk, proses, selesai, sampai pickup tanpa kehilangan konteks pekerjaan.",
  },
];

const highlights = [
  "Role-based access untuk admin, staff, dan teknisi",
  "Multi-toko dengan data servis dan inventory terisolasi",
  "Invoice dan payment flow terhubung ke progress servis",
  "UI siap dipakai di desktop maupun mobile",
];

const steps = [
  {
    title: "Terima unit",
    description: "Buat ticket baru, pilih device, simpan keluhan, dan catat detail customer.",
  },
  {
    title: "Assign atau takeover",
    description: "Teknisi ambil task yang masuk dan lanjutkan pengerjaan tanpa komunikasi yang berantakan.",
  },
  {
    title: "Kelola sparepart dan jasa",
    description: "Tambahkan item ke servis dan biarkan total invoice serta stok ikut menyesuaikan.",
  },
  {
    title: "Tutup transaksi",
    description: "Finalisasi status, tandai pembayaran, dan lakukan pickup dengan jejak proses yang jelas.",
  },
];

const faqs = [
  {
    question: "RMS cocok untuk bisnis apa?",
    answer:
      "RMS dirancang untuk toko servis handphone yang butuh pencatatan ticket, alur teknisi, inventory sparepart, dan pembayaran dalam satu sistem.",
  },
  {
    question: "Apakah bisa dipakai untuk lebih dari satu toko?",
    answer:
      "Bisa. Sistem sudah mendukung multi-toko dengan pemisahan data servis, stok, jasa, dan aktivitas per toko.",
  },
  {
    question: "Bagaimana pembagian akses tim?",
    answer:
      "Admin mengelola toko dan operasional, staff fokus ke service desk, dan teknisi menangani task pengerjaan sesuai alur kerja masing-masing.",
  },
];

export const metadata: Metadata = {
  title: "RMS | Software Manajemen Servis HP Multi-Toko",
  description:
    "RMS membantu toko servis handphone mengelola ticket, teknisi, inventory sparepart, invoice, dan operasional multi-toko dalam satu dashboard.",
  keywords: [
    "software servis hp",
    "aplikasi service handphone",
    "repair management system",
    "manajemen toko servis",
    "inventory sparepart",
    "dashboard teknisi",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "RMS | Software Manajemen Servis HP Multi-Toko",
    description:
      "Kelola service ticket, teknisi, inventory sparepart, dan pembayaran toko servis handphone dari satu dashboard yang rapi.",
    url: "/",
    siteName: "RMS",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RMS | Software Manajemen Servis HP Multi-Toko",
    description:
      "Dashboard modern untuk operasional toko servis handphone: ticket, teknisi, sparepart, dan invoice.",
  },
};

export default async function Home() {
  const session = await getServerSession();
  const isSignedIn = Boolean(session?.user);
  const primaryHref = isSignedIn ? "/dashboard" : "/auth";
  const primaryLabel = isSignedIn ? "Buka Dashboard" : "Mulai Sekarang";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "RMS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Software manajemen servis handphone untuk mengelola ticket, teknisi, inventory sparepart, invoice, dan operasional multi-toko.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "IDR",
    },
  };

  return (
    <main className="relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(120,255,90,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(110,130,255,0.16),transparent_24%),linear-gradient(to_bottom,transparent,rgba(0,0,0,0.03))] dark:bg-[radial-gradient(circle_at_top,rgba(152,255,122,0.16),transparent_26%),radial-gradient(circle_at_85%_20%,rgba(120,140,255,0.14),transparent_22%),linear-gradient(to_bottom,transparent,rgba(255,255,255,0.02))]" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-16 pt-5 sm:px-8 lg:px-10">
        <header className="sticky top-0 z-20 -mx-2 mb-10 flex items-center justify-between rounded-full border border-border/60 bg-background/75 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/55 sm:mx-0 sm:px-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <RiStore2Line className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">RMS</div>
              <div className="text-xs text-muted-foreground">
                Repair Management System
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/user-manual">Dokumentasi</Link>
            </Button>
            <ModeToggle />
            <Button asChild className="rounded-full px-4 sm:px-5">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-12">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
              <RiFlashlightLine className="size-4" />
              Optimized for toko servis handphone modern
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
                Landing page baru untuk bisnis servis yang ingin terlihat premium dan bekerja lebih cepat.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                RMS membantu tim Anda mengelola service ticket, teknisi, inventory sparepart,
                dan pembayaran dari satu dashboard yang bersih, cepat, dan siap scale untuk
                banyak toko.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-full px-6 text-sm font-semibold">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <RiArrowRightLine className="size-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="h-12 rounded-full border-border/70 bg-background/60 px-6 text-sm font-semibold"
              >
                <Link href="/user-manual">Lihat Fitur Lengkap</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/75 px-4 py-4 shadow-sm backdrop-blur"
                >
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                    <RiCheckDoubleLine className="size-4" />
                  </div>
                  <p className="text-sm leading-6 text-foreground/90">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative">
            <div className="absolute -left-6 top-8 hidden h-24 w-24 rounded-full bg-primary/20 blur-3xl lg:block" />
            <div className="absolute -bottom-10 right-6 hidden h-28 w-28 rounded-full bg-blue-500/20 blur-3xl dark:bg-blue-400/20 lg:block" />

            <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-2xl shadow-black/8 backdrop-blur dark:shadow-black/30 sm:p-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Operational Pulse</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard toko dalam satu layar</h2>
                </div>
                <div className="rounded-2xl bg-primary/12 p-3 text-primary">
                  <RiBarChartBoxLine className="size-5" />
                </div>
              </div>

              <div className="grid gap-4 pt-5 sm:grid-cols-2">
                <article className="rounded-3xl border border-border/60 bg-background/80 p-5">
                  <p className="text-sm text-muted-foreground">Ticket aktif</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight">128</p>
                  <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">+18% minggu ini</p>
                </article>
                <article className="rounded-3xl border border-border/60 bg-linear-to-br from-primary/12 to-primary/5 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">SLA teknisi</p>
                    <RiShieldCheckLine className="size-5 text-primary" />
                  </div>
                  <p className="mt-3 text-4xl font-semibold tracking-tight">94%</p>
                  <p className="mt-2 text-sm text-muted-foreground">Task terselesaikan tepat waktu</p>
                </article>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-3xl border border-border/60 bg-background/80 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Antrian servis hari ini</p>
                      <p className="mt-2 text-lg font-semibold">Masuk, Proses, Selesai</p>
                    </div>
                    <RiCompass3Line className="size-5 text-primary" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ["Masuk", "32", "w-4/5"],
                      ["Proses", "57", "w-3/5"],
                      ["Selesai", "39", "w-2/5"],
                    ].map(([label, value, width]) => (
                      <div key={label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className={`h-2 rounded-full bg-primary ${width}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-3xl border border-border/60 bg-background/80 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <RiQrCodeLine className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Pickup lebih terkontrol</p>
                      <p className="text-sm text-muted-foreground">
                        Status dan pembayaran bisa dipastikan sebelum unit keluar.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 rounded-3xl border border-dashed border-border/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      invoice insight
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight">Rp18,4jt</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nilai invoice terdata dari ticket yang sudah memiliki item servis.
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/25">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-14 sm:px-8 lg:grid-cols-3 lg:px-10">
          <div>
            <p className="text-sm font-medium text-primary">Why RMS</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Dibangun untuk operasional servis HP yang real, bukan template generik.
            </h2>
          </div>
          <div className="text-sm leading-7 text-muted-foreground lg:col-span-2 lg:max-w-3xl">
            Dari meja penerimaan sampai teknisi dan kasir, setiap bagian alur kerja punya
            konteks yang tepat. Hasilnya: proses lebih cepat, stok lebih aman, dan pengalaman
            pelanggan terasa lebih profesional.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
        <div className="rounded-[2rem] border border-border/60 bg-card p-6 sm:p-8 lg:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Satu alur kerja yang menyatukan front desk, teknisi, dan administrasi.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-3xl border border-border/60 bg-background/80 p-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  0{index + 1}
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-border/60 bg-linear-to-br from-primary/12 via-card to-card p-8">
            <p className="text-sm font-medium text-primary">SEO-friendly content</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Software manajemen servis HP yang menjawab kebutuhan toko dari awal sampai akhir.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Halaman ini sekarang punya headline yang jelas, struktur section semantik,
              metadata yang relevan, canonical URL, Open Graph, Twitter card, dan JSON-LD untuk
              membantu visibilitas mesin pencari.
            </p>
          </div>

          <div className="grid gap-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-[1.5rem] border border-border/60 bg-card p-6">
                <h3 className="text-lg font-semibold tracking-tight">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-[2rem] border border-border/60 bg-foreground px-6 py-8 text-background sm:px-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Ready to launch</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Tampilkan bisnis servis Anda dengan kesan premium sejak halaman pertama.
            </h2>
            <p className="mt-3 text-sm leading-7 text-background/75">
              Masuk ke dashboard untuk mulai operasional, atau buka dokumentasi untuk melihat
              workflow yang sudah tersedia di RMS.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              variant="secondary"
              asChild
              className="h-12 rounded-full bg-background px-6 text-foreground hover:bg-background/90"
            >
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-12 rounded-full border-background/20 bg-transparent px-6 text-background hover:bg-background/10 hover:text-background"
            >
              <Link href="/user-manual">Baca Dokumentasi</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
