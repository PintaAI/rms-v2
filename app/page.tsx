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
    title: "Ticket masuk rapi",
    description: "Catat unit, keluhan, WhatsApp, IMEI, password, dan device dari katalog global sejak customer datang.",
  },
  {
    icon: RiFoldersLine,
    title: "Stok tidak lagi tebak-tebakan",
    description: "Sparepart berkurang saat dipakai, kembali saat item dihapus, dan bisa diaudit dengan stok fisik.",
  },
  {
    icon: RiTeamLine,
    title: "Teknisi punya tanggung jawab jelas",
    description: "Task tersedia, assigned, takeover, selesai, dan gagal tercatat tanpa bergantung pada chat internal.",
  },
  {
    icon: RiPulseLine,
    title: "Pembayaran dan pickup terpisah",
    description: "DP, paid, dan unit sudah diambil dibedakan agar kasir dan front desk tidak salah membaca status.",
  },
];

const highlights = [
  "Tidak ada lagi status unit yang hanya diketahui satu orang",
  "Pemakaian sparepart langsung tersambung ke invoice",
  "Customer bisa diberi update WhatsApp saat servis selesai/gagal",
  "Bisa mulai sederhana, lalu aktifkan fitur saat toko tumbuh",
];

const painPoints = [
  {
    title: "Unit sudah selesai, tapi customer belum dihubungi",
    description: "RMS membantu mengirim notifikasi WhatsApp dari akun toko saat status berubah menjadi selesai atau gagal.",
  },
  {
    title: "Stok di sistem beda dengan stok fisik",
    description: "Setiap sparepart yang dipakai di servis memengaruhi stok, dan audit gudang mencatat alasan selisih.",
  },
  {
    title: "Total invoice tidak mengikuti pekerjaan teknisi",
    description: "Item jasa, sparepart, dan manual item masuk ke invoice yang sama sehingga biaya tidak tercecer.",
  },
];

const differentiators = [
  "Global phone catalog untuk input device lebih cepat",
  "HP bisa dipakai sebagai scanner barcode saat restock",
  "Audit gudang untuk investigasi selisih stok",
  "Pengaturan fitur agar toko kecil tidak dipaksa memakai alur kompleks",
];

const steps = [
  {
    title: "Terima unit",
    description: "Front desk membuat ticket, memilih device dari katalog, dan mencatat keluhan dengan nomor WhatsApp customer.",
  },
  {
    title: "Kerjakan task",
    description: "Admin assign teknisi atau teknisi mengambil pekerjaan dari daftar task yang tersedia.",
  },
  {
    title: "Tambah item",
    description: "Sparepart, jasa, DP, dan total invoice mengikuti pekerjaan yang benar-benar dilakukan.",
  },
  {
    title: "Pickup final",
    description: "Saat unit keluar, service dikunci dengan status pickup agar data tidak berubah setelah customer mengambil unit.",
  },
];

const faqs = [
  {
    question: "RMS cocok untuk bisnis apa?",
    answer:
      "Untuk toko servis HP yang ingin mengganti catatan manual, chat internal, dan file terpisah menjadi satu alur operasional.",
  },
  {
    question: "Apakah bisa mulai tanpa setup yang berat?",
    answer: "Bisa. Mode Free cocok untuk toko yang dikelola pemilik sendiri: satu toko, ticket dasar, item manual, dan invoice.",
  },
  {
    question: "Apa pembeda RMS dari aplikasi kasir biasa?",
    answer: "RMS mengikuti alur servis: check-in unit, assignment teknisi, pemakaian sparepart, invoice, DP/paid, sampai pickup.",
  },
];

const metrics = [
  { label: "Unit aktif", value: "128", note: "Masuk sampai pickup" },
  { label: "Task teknisi", value: "94%", note: "Terlihat statusnya" },
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
  title: "RMS | Software Operasional Toko Servis HP",
  description:
    "RMS membantu toko servis HP mengelola ticket, teknisi, sparepart, invoice, WhatsApp, pickup, dan multi-toko dalam satu alur kerja.",
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
    title: "RMS | Software Operasional Toko Servis HP",
    description: "Satu sistem untuk mengurangi pekerjaan tercecer, stok meleset, invoice salah, dan status unit yang tidak jelas.",
    url: "/",
    siteName: "RMS",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RMS | Software Operasional Toko Servis HP",
    description: "Ticket, teknisi, sparepart, invoice, WhatsApp, dan pickup dalam satu alur.",
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
      "Software operasional toko servis handphone untuk ticket, teknisi, stok, invoice, WhatsApp, pickup, dan multi-toko.",
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
              Software operasional untuk toko servis HP
            </div>

            <div className="flex flex-col gap-5">
              <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl lg:mx-0 lg:text-7xl">
                Berhenti mengelola servis dari chat, ingatan, dan catatan terpisah.
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 lg:mx-0">
                RMS membantu toko servis HP menjaga setiap unit tetap terlacak: dari customer datang,
                teknisi bekerja, sparepart dipakai, invoice dibuat, sampai unit diambil.
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
                <Link href="/user-manual">Pelajari Alur RMS</Link>
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
                    <Badge variant="secondary" className="w-fit">Pusat kendali operasional</Badge>
                    <h2 className="max-w-sm text-xl font-semibold tracking-tight sm:text-2xl">
                      Status unit, teknisi, stok, dan invoice terbaca dalam satu konteks.
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
                        <p className="mt-1 text-lg font-semibold">Dari check-in sampai pickup</p>
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
                        <p className="font-semibold">Pickup tanpa salah baca</p>
                        <p className="text-sm text-muted-foreground">DP, paid, dan pickup dipisahkan.</p>
                      </div>
                    </div>
                    <div className="mt-5 rounded-3xl border border-dashed border-border/70 bg-background/45 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        kontrol pembayaran
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight">Invoice mengikuti item</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Biaya jasa dan sparepart tidak tercecer di luar pekerjaan.
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
              <p className="text-sm font-medium text-primary">Katalog HP global</p>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Device populer siap dipakai tanpa input ulang per toko.
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
            <p className="text-sm font-medium text-primary">Masalah yang diselesaikan</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Masalah toko servis jarang karena kurang kerja keras. Biasanya karena data operasional tercecer.
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
            Unit masuk dicatat di satu tempat, progress teknisi dibahas di chat, stok sparepart diingat manual,
            dan pembayaran baru dicek saat customer datang mengambil. RMS menyatukan titik-titik itu agar toko
            punya satu sumber kebenaran operasional.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="mb-8 max-w-3xl sm:mb-10">
          <p className="text-sm font-medium text-primary">Pain point toko servis</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Dibangun dari masalah yang benar-benar terjadi di meja servis.
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {painPoints.map((item, index) => (
            <article
              key={item.title}
              className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-sm sm:p-6"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-sm font-semibold text-destructive">
                0{index + 1}
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-10 lg:pb-20">
        <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Fitur utama</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Fitur inti yang menjaga operasional tetap terkendali.
            </h2>
          </div>
          <Badge variant="outline" className="w-fit">Dashboard per peran</Badge>
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
              <p className="text-sm font-medium text-primary">Workflow servis</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Alur kerja yang mengikuti cara toko servis berjalan.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Front desk fokus menerima unit, teknisi fokus memperbaiki, admin melihat kontrol stok,
                pembayaran, dan performa toko.
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
            <p className="text-sm font-medium text-primary">Nilai tambah</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Bukan hanya ticketing. RMS punya fitur praktis yang langsung terasa di toko.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Dari update WhatsApp untuk customer sampai HP sebagai scanner restock, fitur tambahan RMS dibuat
              untuk mengurangi pekerjaan manual tanpa membuat sistem terasa berat.
            </p>
            <div className="mt-6 grid gap-3">
              {differentiators.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <RiCheckDoubleLine className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-sm leading-6 text-foreground/90">{item}</p>
                </div>
              ))}
            </div>
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
            <p className="text-sm font-medium text-primary">Mulai dari alur paling sederhana</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Rapikan operasional toko servis sebelum masalah kecil menjadi kebocoran besar.
            </h2>
            <p className="mt-3 text-sm leading-7 text-background/75">
              Gunakan mode sederhana untuk mulai, lalu aktifkan tim, inventory, scanner, WhatsApp,
              analytics, dan audit saat toko Anda siap.
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
