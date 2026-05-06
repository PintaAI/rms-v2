import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { PLAN_REGISTRY, type SubscriptionPlan } from "@/lib/plans";
import { getFeaturesForPlan, FEATURE_REGISTRY, type FeatureKey } from "@/lib/features";
import { getReferralLink, DEFAULT_PREMIUM_COMMISSION, DEFAULT_ENTERPRISE_COMMISSION } from "@/lib/affiliate";
import {
  RiSmartphoneLine,
  RiFoldersLine,
  RiTeamLine,
  RiPulseLine,
  RiCheckDoubleLine,
  RiFlashlightLine,
  RiBarChartBoxLine,
  RiQrCodeLine,
  RiWhatsappLine,
  RiArchiveLine,
  RiFileSearchLine,
  RiSettingsLine,
  RiArrowRightLine,
  RiStore2Line,
  RiLightbulbLine,
  RiUserSearchLine,
  RiCustomerService2Line,
  RiLinksLine,
  RiUserAddLine,
} from "@remixicon/react";
import Link from "next/link";

interface AffiliateProductKnowledgeProps {
  affiliatorName?: string;
  affiliateCode?: string;
}

const isAffiliateMode = (props: AffiliateProductKnowledgeProps): props is { affiliatorName: string; affiliateCode: string } =>
  Boolean(props.affiliatorName && props.affiliateCode);

const planKeys: SubscriptionPlan[] = ["free", "premium", "enterprise"];

const featureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "service.manualItems": RiSettingsLine,
  "inventory.management": RiArchiveLine,
  "karyawan.management": RiTeamLine,
  "staff.workflow": RiUserSearchLine,
  "technician.workflow": RiSettingsLine,
  "activityLog.view": RiFileSearchLine,
  "whatsapp.integration": RiWhatsappLine,
  "analytics.revenue": RiBarChartBoxLine,
  "inventory.audit": RiQrCodeLine,
};

const steps = [
  {
    title: "Terima unit",
    description: "Front desk membuat ticket, memilih device dari katalog global, dan mencatat keluhan dengan nomor WhatsApp customer.",
  },
  {
    title: "Kerjakan task",
    description: "Admin assign teknisi atau teknisi mengambil pekerjaan dari daftar task yang tersedia — semua terlacak tanpa chat.",
  },
  {
    title: "Tambah item",
    description: "Sparepart, jasa, DP, dan total invoice mengikuti pekerjaan yang benar-benar dilakukan teknisi.",
  },
  {
    title: "Pickup final",
    description: "Saat unit keluar, service dikunci dengan flag pickup agar data tidak berubah setelah customer mengambil unit.",
  },
];

const painPoints = [
  {
    title: "Unit selesai, customer belum dihubungi",
    description: "RMS mengirim notifikasi WhatsApp otomatis dari akun toko saat status berubah jadi selesai atau gagal.",
  },
  {
    title: "Stok di sistem beda dengan stok fisik",
    description: "Setiap sparepart yang dipakai di servis langsung memengaruhi stok. Audit gudang mencatat alasan selisih stok.",
  },
  {
    title: "Total invoice tidak mengikuti pekerjaan teknisi",
    description: "Item jasa, sparepart, dan item manual masuk ke satu invoice. Biaya tidak tercecer antar catatan terpisah.",
  },
];

const differentiators = [
  { title: "Katalog HP global", description: "Device dari berbagai brand sudah tersedia — input unit lebih cepat tanpa ketik ulang per toko." },
  { title: "HP sebagai scanner barcode", description: "Kamera HP dipakai untuk scan barcode saat restock sparepart — tidak perlu alat tambahan." },
  { title: "Audit gudang fisik", description: "Jalankan audit berkala, bandingkan stok sistem vs stok fisik, dan catat alasan selisih." },
  { title: "Feature toggle", description: "Fitur bisa diaktifkan/nonaktifkan per toko. Toko kecil tidak dipaksa memakai alur yang kompleks." },
];

const faqs = [
  {
    question: "Siapa target customer RMS?",
    answer: "Toko servis HP, konter, dan repair shop yang ingin mengganti catatan manual, chat internal, dan spreadsheet menjadi satu sistem operasional terpadu.",
  },
  {
    question: "Apakah customer dapat trial gratis?",
    answer: "Ya. Paket Pro tersedia trial 30 hari gratis. Customer bisa menjalankan workflow penuh sebelum memutuskan berlangganan.",
  },
  {
    question: "Kapan komisi saya dibayarkan?",
    answer: "Komisi dibuat otomatis saat referral Anda upgrade ke paket berbayar. Status komisi berubah dari pending → approved → paid setelah diverifikasi oleh tim RMS.",
  },
  {
    question: "Apakah komisi berlaku berulang setiap bulan?",
    answer: "Saat ini komisi bersifat satu kali per customer yang upgrade ke paket Pro atau Enterprise. Fitur komisi berulang direncanakan di development selanjutnya.",
  },
  {
    question: "Bisakah saya lihat siapa yang daftar lewat link saya?",
    answer: "Ya. Gunakan link tracking pribadi Anda untuk melihat dashboard performa, riwayat referral, dan status komisi secara real-time.",
  },
  {
    question: "Apakah saya perlu punya akun RMS untuk jadi affiliator?",
    answer: "Tidak. Anda bisa menjadi affiliator eksternal tanpa akun RMS. Cukup daftar melalui superuser RMS dan dapatkan link referral + tracking link Anda.",
  },
];

const marketingTips = [
  {
    title: "Target toko servis yang masih manual",
    description: "Cari toko servis HP di kota kecil atau pinggiran yang masih pakai buku catatan fisik dan WhatsApp untuk koordinasi. Mereka paling merasakan manfaat RMS.",
  },
  {
    title: "Tunjukkan trial gratis 30 hari",
    description: "Banyak pemilik toko ragu bayar software. Tekankan bahwa Pro bisa dicoba gratis 30 hari penuh — tanpa kartu kredit, tanpa komitmen.",
  },
  {
    title: "Ceritakan sebelum vs sesudah",
    description: "Gambarkan skenario nyata: sebelum pakai RMS (chat berantakan, stok gak jelas, invoice salah) vs sesudah (semua terintegrasi dalam satu dashboard).",
  },
  {
    title: "Bagikan di komunitas servis HP",
    description: "Grup Facebook, WhatsApp, dan Telegram komunitas teknisi servis HP adalah channel paling efektif. Bagikan link referral Anda beserta penjelasan manfaatnya.",
  },
  {
    title: "Manfaatkan konten video singkat",
    description: "Rekam video 30-60 detik menunjukkan dashboard RMS atau fitur andalan. Video singkat jauh lebih engaging daripada teks panjang di media sosial.",
  },
  {
    title: "Follow up dengan calon customer",
    description: "Jika ada yang klik link referral Anda tapi belum daftar, follow up dengan tawaran bantuan setup atau demo singkat. Sentuhan personal meningkatkan konversi.",
  },
];

function PlanFeatureCheck({ plan, featureKey }: { plan: SubscriptionPlan; featureKey: FeatureKey }) {
  const features = getFeaturesForPlan(plan);
  const has = features.some((f) => f.key === featureKey);
  if (!has) return <span className="text-muted-foreground">—</span>;
  if (plan === "free") return <RiCheckDoubleLine className="ml-auto size-4 text-emerald-500" />;
  if (plan === "premium") return <RiCheckDoubleLine className="ml-auto size-4 text-blue-500" />;
  return <RiCheckDoubleLine className="ml-auto size-4 text-violet-500" />;
}

function PlanLabelBadge({ plan }: { plan: SubscriptionPlan }) {
  const variant = plan === "enterprise" ? "default" : plan === "premium" ? "default" : "secondary";
  return <Badge variant={variant as "default" | "secondary"}>{PLAN_REGISTRY[plan].label}</Badge>;
}

function limitDisplay(value: number | null, suffix = ""): string {
  if (value === null) return "Tidak terbatas";
  return `${value}${suffix}`;
}

export function AffiliateProductKnowledge(props: AffiliateProductKnowledgeProps) {
  const isAffiliate = isAffiliateMode(props);
  const referralLink = isAffiliate ? getReferralLink(props.affiliateCode) : "";
  const whatsappUrl = `https://wa.me/6285728212056?text=Halo%20RMS%2C%20saya%20tertarik%20menjadi%20affiliator.`;

  return (
    <main className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            {isAffiliate ? "Product Knowledge" : "Program Afiliasi"}{" "}&middot;{" "}Product Knowledge
          </p>
          <h1 className="text-3xl font-black tracking-tight">Kenali RMS yang Anda Pasarkan</h1>
          {isAffiliate ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              Selamat datang, {props.affiliatorName}. Halaman ini membantu Anda memahami produk RMS secara mendalam — dari alur kerja,
              fitur, paket harga, hingga strategi marketing — agar Anda bisa mempromosikan dengan percaya diri.
            </p>
          ) : (
            <p className="max-w-2xl text-sm text-muted-foreground">
              Pelajari produk RMS secara mendalam — dari alur kerja, fitur, paket harga, hingga struktur komisi —
              sebelum Anda memutuskan menjadi affiliator. Program affiliate RMS terbuka untuk siapa saja.
            </p>
          )}
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                <RiStore2Line className="size-5" />
              </div>
              <CardTitle className="mt-4">Apa itu RMS?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-7">
              <p>
                RMS (Repair Management System) adalah <strong className="text-foreground">software operasional untuk toko servis HP</strong>.
                RMS menggantikan catatan manual, chat internal yang berantakan, dan spreadsheet terpisah menjadi satu alur kerja terpadu.
              </p>
              <p className="mt-3">
                Dari unit masuk, teknisi bekerja, sparepart dipakai, invoice dibuat, sampai unit diambil customer — semua tercatat
                dan terlacak dalam satu dashboard.
              </p>
            </CardContent>
          </Card>

          {isAffiliate ? (
            <Card>
              <CardHeader>
                <div className="inline-flex rounded-2xl bg-chart-3/10 p-3 text-chart-3">
                  <RiLinksLine className="size-5" />
                </div>
                <CardTitle className="mt-4">Referral Link Anda</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <p className="text-muted-foreground">
                  Bagikan link ini ke calon customer. Setiap pendaftaran yang masuk lewat link Anda akan tercatat sebagai referral.
                </p>
                <code className="rounded-xl border bg-muted/50 px-4 py-2 break-all font-mono text-xs">
                  {referralLink}
                </code>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="inline-flex rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
                  <RiUserAddLine className="size-5" />
                </div>
                <CardTitle className="mt-4">Jadi Affiliator RMS</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p>
                  Dapatkan komisi untuk setiap referral yang upgrade ke paket berbayar. Program affiliate terbuka untuk siapa saja — Anda tidak perlu punya akun RMS.
                </p>
                <Button asChild className="w-fit">
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    <RiWhatsappLine data-icon="inline-start" />
                    Daftar via WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="mb-6">
            <p className="text-sm font-medium text-primary">Alur kerja</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Empat langkah yang mengikuti cara toko servis berjalan.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Card key={step.title} className="group transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    0{index + 1}
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <div className="mb-4">
              <p className="text-sm font-medium text-destructive">Pain points</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Masalah yang diselesaikan RMS.
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {painPoints.map((item, index) => (
                <Card key={item.title}>
                  <CardContent className="flex gap-4 pt-6">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-sm font-semibold text-destructive">
                      0{index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4">
              <p className="text-sm font-medium text-primary">Nilai tambah</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Kenapa RMS berbeda.
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {differentiators.map((item) => (
                <Card key={item.title}>
                  <CardContent className="flex gap-4 pt-6">
                    <RiCheckDoubleLine className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <section>
          <div className="mb-6">
            <p className="text-sm font-medium text-primary">Paket &amp; Harga</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Tiga paket yang bisa Anda tawarkan.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Customer bisa mulai dari Free, upgrade ke Pro dengan trial 30 hari gratis, atau langsung Enterprise untuk kebutuhan besar.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Paket</TableHead>
                  <TableHead>Harga / bulan</TableHead>
                  <TableHead>Toko</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Teknisi</TableHead>
                  <TableHead>Servis / bulan</TableHead>
                  <TableHead>Trial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planKeys.map((plan) => {
                  const config = PLAN_REGISTRY[plan];
                  return (
                    <TableRow key={plan}>
                      <TableCell><PlanLabelBadge plan={plan} /></TableCell>
                      <TableCell className="font-medium">
                        {config.monthlyPrice === null ? "Custom" : formatCurrency(config.monthlyPrice)}
                        {plan === "premium" && config.additionalTokoPrice ? (
                          <div className="text-xs text-muted-foreground">+{formatCurrency(config.additionalTokoPrice)}/toko tambahan</div>
                        ) : null}
                      </TableCell>
                      <TableCell>{limitDisplay(config.includedTokos, " toko")}</TableCell>
                      <TableCell>{limitDisplay(config.limits.maxStaff, " orang")}</TableCell>
                      <TableCell>{limitDisplay(config.limits.maxTechnicians, " orang")}</TableCell>
                      <TableCell>{limitDisplay(config.limits.maxServicesMonthly, " servis")}</TableCell>
                      <TableCell>
                        {config.trialDays ? `${config.trialDays} hari gratis` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <div className="mb-6">
            <p className="text-sm font-medium text-primary">Fitur per paket</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Fitur apa yang didapat di setiap paket.
            </h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fitur</TableHead>
                      <TableHead className="text-center">Free</TableHead>
                      <TableHead className="text-center">Pro</TableHead>
                      <TableHead className="text-center">Enterprise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(FEATURE_REGISTRY).map(([key, feature]) => {
                      const FeatureIcon = featureIcons[key] ?? RiSettingsLine;
                      return (
                        <TableRow key={key}>
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <FeatureIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{feature.label}</div>
                                <div className="text-xs text-muted-foreground">{feature.description}</div>
                              </div>
                            </div>
                          </TableCell>
                          {planKeys.map((plan) => (
                            <TableCell key={plan} className="text-center">
                              <PlanFeatureCheck plan={plan} featureKey={feature.key} />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-6">
            <p className="text-sm font-medium text-emerald-500">Komisi Anda</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Struktur komisi affiliator RMS.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-emerald-500">Komisi Pro</p>
                <div className="mt-2 text-3xl font-bold">{formatCurrency(DEFAULT_PREMIUM_COMMISSION)}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Setiap kali referral Anda upgrade ke paket <strong>Pro</strong> (Rp 990.000/bulan).
                </p>
              </CardContent>
            </Card>
            <Card className="border-violet-500/20 bg-violet-500/5">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-violet-500">Komisi Enterprise</p>
                <div className="mt-2 text-3xl font-bold">{formatCurrency(DEFAULT_ENTERPRISE_COMMISSION)}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Setiap kali referral Anda upgrade ke paket <strong>Enterprise</strong> (harga custom).
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardContent className="pt-6">
              <h3 className="font-semibold">Cara kerja komisi</h3>
              <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="flex gap-3 rounded-xl border bg-muted/30 p-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</div>
                  <p>Customer daftar lewat <strong>link referral</strong> Anda.</p>
                </div>
                <div className="flex gap-3 rounded-xl border bg-muted/30 p-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</div>
                  <p>Customer <strong>upgrade ke Pro atau Enterprise</strong>.</p>
                </div>
                <div className="flex gap-3 rounded-xl border bg-muted/30 p-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</div>
                  <p>Komisi dibuat, <strong>diverifikasi tim RMS</strong>, lalu dibayarkan.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-6">
            <p className="text-sm font-medium text-primary">FAQ Affiliator</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Pertanyaan yang sering ditanyakan.
            </h2>
          </div>

          <div className="grid gap-3">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardContent className="pt-6">
                  <h3 className="flex items-start gap-3 font-semibold">
                    <RiCustomerService2Line className="mt-0.5 size-5 shrink-0 text-primary" />
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6">
            <p className="text-sm font-medium text-amber-500">Tips marketing</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Strategi mempromosikan RMS.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tips praktis untuk meningkatkan konversi referral Anda.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {marketingTips.map((tip) => (
              <Card key={tip.title} className="group transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="inline-flex rounded-2xl bg-amber-500/10 p-3 text-amber-500">
                    <RiLightbulbLine className="size-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{tip.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{tip.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-foreground px-6 py-8 text-background">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {isAffiliate ? "Siap mempromosikan RMS?" : "Tertarik menjadi affiliator?"}
              </h2>
              <p className="mt-2 max-w-lg text-sm text-background/70 leading-6">
                {isAffiliate
                  ? "Gunakan link referral di atas dan tracking link pribadi Anda untuk memantau performa. Setiap konversi membawa Anda lebih dekat ke komisi."
                  : "Daftar sekarang dan dapatkan link referral unik Anda. Mulai dapatkan komisi untuk setiap toko servis HP yang Anda bawa ke RMS."}
              </p>
            </div>
            {isAffiliate ? (
              <Button variant="secondary" asChild className="h-11 rounded-full bg-background px-5 text-foreground hover:bg-background/90">
                <Link href={`/affiliate/portal/${props.affiliateCode}`}>
                  Lihat Dashboard
                  <RiArrowRightLine data-icon="inline-end" />
                </Link>
              </Button>
            ) : (
              <Button variant="secondary" asChild className="h-11 rounded-full bg-background px-5 text-foreground hover:bg-background/90">
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  Daftar via WhatsApp
                  <RiArrowRightLine data-icon="inline-end" />
                </a>
              </Button>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          RMS &mdash; Repair Management System. Software operasional untuk toko servis HP.
        </p>
      </div>
    </main>
  );
}

export default AffiliateProductKnowledge;
