import type { Metadata } from "next";
import { cacheLife } from "next/cache";
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
  RiSmartphoneLine,
  RiStore2Line,
  RiTeamLine,
} from "@remixicon/react";
import { ModeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth";
import { brandIconMap, getBrandIcon } from "@/lib/brand-icons";
import prisma from "@/lib/prisma";

const features = [
  {
    icon: RiSmartphoneLine,
    title: "Ticket cepat",
    description: "Catat unit, keluhan, kontak pelanggan, dan estimasi tanpa form yang berat.",
  },
  {
    icon: RiFoldersLine,
    title: "Stok per toko",
    description: "Sparepart dan jasa tetap terpisah, sehingga operasional multi-toko lebih aman.",
  },
  {
    icon: RiTeamLine,
    title: "Peran tim jelas",
    description: "Admin, staff, dan teknisi masuk ke alur yang sesuai dengan pekerjaannya.",
  },
  {
    icon: RiPulseLine,
    title: "Status terlihat",
    description: "Pantau proses dari unit masuk, pengerjaan, pembayaran, sampai pickup.",
  },
];

const highlights = [
  "Admin, staff, dan teknisi punya dashboard sendiri",
  "Data servis dan stok tetap terpisah per toko",
  "Invoice mengikuti item servis dan pembayaran",
  "Tampilan nyaman untuk meja servis dan mobile",
];

const steps = [
  {
    title: "Terima unit",
    description: "Buat ticket, pilih device, catat keluhan, lalu simpan detail pelanggan.",
  },
  {
    title: "Assign task",
    description: "Teknisi mengambil pekerjaan atau staff mengatur assignment sesuai antrean.",
  },
  {
    title: "Tambah item",
    description: "Sparepart, jasa, catatan pengerjaan, dan total biaya ikut tersusun rapi.",
  },
  {
    title: "Pickup jelas",
    description: "Tutup transaksi, tandai pembayaran, lalu serahkan unit dengan status final.",
  },
];

const faqs = [
  {
    question: "RMS cocok untuk bisnis apa?",
    answer:
      "Untuk toko servis HP yang butuh ticket, teknisi, stok, pembayaran, dan aktivitas toko dalam satu sistem.",
  },
  {
    question: "Apakah bisa dipakai untuk lebih dari satu toko?",
    answer: "Bisa. Data servis, stok, karyawan, dan aktivitas dipisah per toko.",
  },
  {
    question: "Bagaimana pembagian akses tim?",
    answer: "Admin memantau operasional, staff mengelola meja servis, teknisi fokus ke pengerjaan.",
  },
];

const metrics = [
  { label: "Ticket aktif", value: "128", note: "+18% minggu ini" },
  { label: "SLA teknisi", value: "94%", note: "Task tepat waktu" },
  { label: "Invoice", value: "Rp18,4jt", note: "Dari item servis" },
];

const serviceQueue = [
  ["Masuk", "32", "w-4/5"],
  ["Proses", "57", "w-3/5"],
  ["Selesai", "39", "w-2/5"],
];

const fallbackCatalog = [
  { brandName: "Apple", modelName: "iPhone 15" },
  { brandName: "Apple", modelName: "iPhone 14 Pro" },
  { brandName: "Samsung", modelName: "Galaxy S24" },
  { brandName: "Samsung", modelName: "Galaxy A55" },
  { brandName: "Xiaomi", modelName: "Redmi Note 13" },
  { brandName: "OPPO", modelName: "Reno 11" },
  { brandName: "vivo", modelName: "V30" },
  { brandName: "ASUS", modelName: "ROG Phone 6" },
  { brandName: "Google", modelName: "Pixel 8" },
  { brandName: "Realme", modelName: "12 Pro" },
];

type PhoneCatalogItem = {
  brandName: string;
  modelName: string;
};

function normalizePhoneCatalogItem(item: PhoneCatalogItem | string): PhoneCatalogItem {
  if (typeof item !== "string") {
    return item;
  }

  const [brandName = "Unknown", ...modelParts] = item.split(" ");

  return {
    brandName,
    modelName: modelParts.join(" ") || item,
  };
}

function hasBrandIcon(brandName: string) {
  return Boolean(brandIconMap[brandName.toLowerCase().trim()]);
}

function getCatalogLabel(device: PhoneCatalogItem) {
  return hasBrandIcon(device.brandName)
    ? device.modelName
    : `${device.brandName} ${device.modelName}`;
}

async function getLandingPhoneCatalog() {
  "use cache";
  cacheLife({ revalidate: 3600 });

  try {
    const devices = await prisma.hpCatalog.findMany({
      orderBy: [{ brand: { name: "asc" } }, { modelName: "asc" }],
      select: {
        modelName: true,
        brand: { select: { name: true } },
      },
      take: 36,
    });

    if (!devices.length) {
      return fallbackCatalog;
    }

    return devices.map((device) => ({
      brandName: device.brand.name,
      modelName: device.modelName,
    }));
  } catch (error) {
    console.error("Error fetching global phone catalog:", error);
    return fallbackCatalog;
  }
}

export const metadata: Metadata = {
  title: "RMS | Software Manajemen Servis HP Multi-Toko",
  description:
    "RMS menyatukan ticket, teknisi, stok, dan pembayaran untuk toko servis HP multi-toko.",
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
    description: "Satu dashboard rapi untuk ticket, teknisi, stok, dan pembayaran toko servis HP.",
    url: "/",
    siteName: "RMS",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RMS | Software Manajemen Servis HP Multi-Toko",
    description: "Dashboard ringkas untuk ticket, teknisi, stok, dan invoice.",
  },
};

export default async function Home() {
  const session = await getServerSession();
  const phoneCatalog = (await getLandingPhoneCatalog()).map(normalizePhoneCatalogItem);
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
      "Software manajemen servis handphone untuk ticket, teknisi, stok, invoice, dan multi-toko.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "IDR",
    },
  };

  return (
    <main className="relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklab,var(--primary)_24%,transparent),transparent_32%),radial-gradient(circle_at_90%_8%,color-mix(in_oklab,var(--chart-3)_18%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_oklab,var(--muted)_28%,transparent),transparent_48%)]" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto flex min-h-[auto] w-full max-w-7xl flex-col px-4 pb-14 pt-4 sm:px-6 lg:min-h-screen lg:px-10 lg:pb-20">
        <header className="sticky top-3 z-20 mb-10 flex items-center justify-between gap-3 rounded-full border border-border/60 bg-background/82 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/62 sm:mb-12 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:size-10">
              <RiStore2Line className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight">RMS</div>
              <div className="hidden text-xs text-muted-foreground sm:block">
                Repair Management System
              </div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button variant="ghost" asChild className="hidden rounded-full sm:inline-flex">
              <Link href="/user-manual">Dokumentasi</Link>
            </Button>
            <ModeToggle />
            <Button asChild className="h-9 rounded-full px-3 text-xs sm:px-5">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
          <section className="flex flex-col gap-7 text-center sm:gap-8 lg:text-left">
            <div className="mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary lg:mx-0">
              <RiFlashlightLine className="size-4" />
              Operasional servis HP, dibuat lebih cepat
            </div>

            <div className="flex flex-col gap-5">
              <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl lg:mx-0 lg:text-7xl">
                Kelola servis, stok, dan tim tanpa layar yang berantakan.
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 lg:mx-0">
                RMS menyatukan ticket, teknisi, sparepart, invoice, dan operasional multi-toko
                dalam alur yang cepat dibaca dari desktop maupun mobile.
              </p>
            </div>

            <div className="grid gap-3 sm:mx-auto sm:grid-cols-2 lg:mx-0 lg:flex lg:flex-wrap">
              <Button asChild className="h-12 rounded-full px-6 text-sm font-semibold">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <RiArrowRightLine data-icon="inline-end" />
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

            <div className="grid gap-3 text-left sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-3xl border border-border/60 bg-card/78 p-4 shadow-sm backdrop-blur"
                >
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                    <RiCheckDoubleLine className="size-4" />
                  </div>
                  <p className="text-sm leading-6 text-foreground/90">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-8 bottom-8 h-32 w-32 rounded-full bg-chart-3/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/86 p-3 shadow-2xl shadow-foreground/10 backdrop-blur sm:p-5">
              <div className="rounded-[1.65rem] border border-border/60 bg-background/72 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="w-fit">Operational Pulse</Badge>
                    <h2 className="max-w-sm text-xl font-semibold tracking-tight sm:text-2xl">
                      Semua inti operasional dalam satu layar.
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-primary/12 p-3 text-primary">
                    <RiBarChartBoxLine className="size-5" />
                  </div>
                </div>

                <div className="grid gap-3 pt-4 sm:grid-cols-3">
                  {metrics.map((metric, index) => (
                    <article
                      key={metric.label}
                      className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm"
                    >
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                        {metric.value}
                      </p>
                      <Badge
                        variant={index === 0 ? "success" : "outline"}
                        className="mt-3"
                      >
                        {metric.note}
                      </Badge>
                    </article>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[1.12fr_0.88fr]">
                  <article className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Antrian servis hari ini</p>
                        <p className="mt-1 text-lg font-semibold">Masuk, proses, selesai</p>
                      </div>
                      <RiCompass3Line className="size-5 shrink-0 text-primary" />
                    </div>
                    <div className="mt-5 flex flex-col gap-3">
                      {serviceQueue.map(([label, value, width]) => (
                        <div key={label} className="flex flex-col gap-2">
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

                  <article className="rounded-3xl border border-border/60 bg-linear-to-br from-primary/14 via-card to-card p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <RiQrCodeLine className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Pickup lebih tenang</p>
                        <p className="text-sm text-muted-foreground">Status dan bayar jelas.</p>
                      </div>
                    </div>
                    <div className="mt-5 rounded-3xl border border-dashed border-border/70 bg-background/45 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        invoice insight
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight">Siap cetak</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Item servis dan sparepart langsung tersusun untuk invoice.
                      </p>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/52 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Global phone catalog</p>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Device populer siap dipakai di semua toko.
              </h2>
            </div>
            <Badge variant="outline" className="w-fit">
              {phoneCatalog.length}+ model tersedia
            </Badge>
          </div>

          <div className="group relative overflow-hidden rounded-full border border-border/60 bg-background/75 py-2 shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-background to-transparent" />
            <div className="flex w-max min-w-full animate-catalog-marquee gap-2 px-2 group-hover:[animation-play-state:paused]">
              {[...phoneCatalog, ...phoneCatalog].map((device, index) => (
                <span
                  key={`${device.brandName}-${device.modelName}-${index}`}
                  aria-hidden={index >= phoneCatalog.length}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs sm:px-4 sm:text-sm"
                >
                  <span className="text-primary">{getBrandIcon(device.brandName)}</span>
                  {getCatalogLabel(device)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/25">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-10 lg:py-16">
          <div>
            <p className="text-sm font-medium text-primary">Why RMS</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Dibuat untuk kerja lapangan, bukan template generik.
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
            Dari meja penerimaan sampai kasir, tiap peran punya konteks yang pas. Proses lebih
            cepat, stok lebih aman, dan pengalaman pelanggan terasa lebih rapi di semua ukuran layar.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Fitur utama</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Ringkas di layar kecil, lengkap saat dibutuhkan.
            </h2>
          </div>
          <Badge variant="outline" className="w-fit">Multi-role dashboard</Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6"
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

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-10 lg:pb-20">
        <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-linear-to-br from-primary/14 via-card to-card p-6 sm:p-8 lg:p-10">
              <p className="text-sm font-medium text-primary">Workflow</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Satu alur kerja untuk front desk, teknisi, dan admin.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Urutan kerja dibuat jelas agar tim tidak perlu menebak status unit atau total biaya.
              </p>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:p-6">
              {steps.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-3xl border border-border/60 bg-background/80 p-5"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    0{index + 1}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-10 lg:pb-20">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-border/60 bg-linear-to-br from-primary/12 via-card to-card p-6 sm:p-8">
            <p className="text-sm font-medium text-primary">Built for clarity</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Software servis HP yang padat, jelas, dan relevan.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Copy, visual, dan struktur halaman dibuat langsung menjelaskan nilai RMS tanpa
              mengorbankan keterbacaan di ponsel.
            </p>
          </div>

          <div className="grid gap-3">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-[1.5rem] border border-border/60 bg-card p-5 sm:p-6">
                <h3 className="text-lg font-semibold tracking-tight">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-10 lg:pb-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-[2rem] border border-border/60 bg-foreground px-5 py-7 text-background sm:px-8 sm:py-9 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Ready to launch</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Tampilkan bisnis servis Anda dengan lebih rapi sejak awal.
            </h2>
            <p className="mt-3 text-sm leading-7 text-background/75">
              Masuk ke dashboard untuk mulai kerja, atau buka dokumentasi untuk melihat alurnya.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
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
