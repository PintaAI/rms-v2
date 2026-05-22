import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { PLAN_REGISTRY, type SubscriptionPlan } from "@/lib/plans";
import { getFeaturesForPlan, FEATURE_REGISTRY, type FeatureKey } from "@/lib/features";
import { getReferralLink, DEFAULT_ENTERPRISE_COMMISSION_PERCENT, DEFAULT_PRO_RECURRING_COMMISSION_PERCENT, DEFAULT_REGISTER_COMMISSION } from "@/lib/affiliate";
import {
  RiCheckDoubleLine,
  RiBarChartBoxLine,
  RiQrCodeLine,
  RiWhatsappLine,
  RiArchiveLine,
  RiBroadcastLine,
  RiSettingsLine,
  RiArrowRightLine,
  RiStore2Line,
  RiLightbulbLine,
  RiUserSearchLine,
  RiCustomerService2Line,
  RiLinksLine,
  RiTeamLine,
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
  "service.management": RiCustomerService2Line,
  "service.manualItems": RiSettingsLine,
  "service.technicianAssignment": RiUserSearchLine,
  "inventory.management": RiArchiveLine,
  "retail.sales": RiStore2Line,
  "karyawan.management": RiTeamLine,
  "staff.workflow": RiUserSearchLine,
  "technician.workflow": RiSettingsLine,
  "realtime.updates": RiBroadcastLine,
  "realtime.mobileScanner": RiQrCodeLine,
  "whatsapp.integration": RiWhatsappLine,
  "analytics.revenue": RiBarChartBoxLine,
  "inventory.audit": RiQrCodeLine,
};

const workflowModes = [
  {
    title: "Solo owner",
    audience: "Untuk pemilik toko yang merangkap admin, staff, dan teknisi.",
    icon: RiStore2Line,
    accent: "bg-primary/10 text-primary",
    steps: [
      "Terima unit service dan catat keluhan customer.",
      "Lakukan perbaikan langsung tanpa assign teknisi.",
      "Input sparepart yang dipakai dan jasa yang dikerjakan.",
      "Hubungi customer saat unit siap diambil, lalu final pickup.",
    ],
  },
  {
    title: "Team work",
    audience: "Untuk toko yang memisahkan kontrol admin, input staff, dan pengerjaan teknisi.",
    icon: RiTeamLine,
    accent: "bg-chart-3/10 text-chart-3",
    steps: [
      "Admin monitoring dan kontrol seluruh aktivitas toko.",
      "Staff input device, data customer, dan ticket service.",
      "Teknisi melakukan perbaikan, tambah sparepart, dan tambah jasa.",
      "Staff tandai selesai, hubungi customer, lalu proses final pickup.",
    ],
  },
  {
    title: "Retail & kasir",
    audience: "Untuk toko servis yang juga menjual sparepart, aksesoris, atau barang retail.",
    icon: RiArchiveLine,
    accent: "bg-emerald-500/10 text-emerald-500",
    steps: [
      "Admin atau staff dengan permission retail mengelola inventory.",
      "Kasir menjual barang retail langsung dari stok toko.",
      "Stok otomatis berkurang dan transaksi masuk riwayat penjualan.",
      "Service dan retail tetap tercatat dalam satu sistem operasional.",
    ],
  },
];

const painPoints = [
  {
    title: "Alur service tidak jelas",
    description: "Unit masuk, dikerjakan siapa, statusnya apa, sudah selesai atau belum, dan sudah pickup atau belum tidak lagi tersebar di buku, chat, atau ingatan owner.",
  },
  {
    title: "Owner terlalu bergantung pada catatan manual rawan miss kalkulasi",
    description: "Untuk solo owner, RMS menyimpan dan mengelola keluhan customer, sparepart yang dipakai, harga jasa, DP, total tagihan, dan siapa yang harus dihubungi.",
  },
  {
    title: "Koordinasi team berantakan",
    description: "Staff input unit, teknisi mengerjakan, dan admin memonitor tanpa harus bergantung pada chat internal yang mudah tenggelam atau miss update.",
  },
  {
    title: "Telat hubungi customer",
    description: "RMS membantu memastikan unit yang sudah selesai bisa segera dikabari ke customer sehingga unit tidak menumpuk dan cashflow tidak tertahan.",
  },
  {
    title: "Invoice tidak mengikuti pekerjaan nyata",
    description: "Sparepart dan jasa yang dipakai teknisi masuk ke invoice yang sama, sehingga toko tidak kurang tagih atau hitung ulang manual.",
  },
  {
    title: "Stok sparepart tidak sinkron",
    description: "Sparepart yang dipakai untuk service atau dijual lewat kasir langsung memengaruhi stok, sehingga data sistem lebih dekat dengan stok fisik.",
  },
  {
    title: "Service dan retail terpisah",
    description: "Toko yang juga menjual sparepart atau aksesoris bisa mengelola service, inventory, kasir, dan riwayat penjualan dalam satu sistem.",
  },
  {
    title: "Admin tidak punya kontrol real-time",
    description: "Owner atau admin bisa melihat service masuk, pekerjaan teknisi, item yang keluar, dan penjualan retail tanpa harus tanya satu-satu.",
  },
];

const differentiators = [
  { title: "Katalog HP global", description: "Device dari berbagai brand sudah tersedia — input unit lebih cepat tanpa ketik ulang per toko." },
  { title: "HP sebagai scanner barcode", description: "Kamera HP dipakai untuk scan barcode saat restock sparepart — tidak perlu alat tambahan." },
  { title: "Audit gudang fisik", description: "Jalankan audit berkala, bandingkan stok sistem vs stok fisik, dan catat alasan selisih." },
  { title: "Fleksibel untuk solo atau team", description: "Toko kecil bisa berjalan sederhana sebagai solo owner. Toko besar bisa memisahkan role admin, staff, dan teknisi." },
  { title: "Built-in retail & kasir", description: "RMS tidak hanya untuk service. Toko juga bisa menjual sparepart, aksesoris, atau barang retail langsung dari inventory yang sama." },
  { title: "Feature toggle & access-controll", description: "Fitur bisa diaktifkan/nonaktifkan per toko. Toko kecil tidak dipaksa memakai alur yang kompleks. bisa juga menentukan apa yang boleh dan tidak boleh dilakukan" },
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
    answer: "Komisi registrasi dibuat otomatis saat referral Anda mendaftar lewat link referral. Untuk komisi Enterprise diproses setelah customer menyelesaikan deal. Status komisi berubah dari pending → approved → paid setelah diverifikasi oleh tim RMS.",
  },
  {
    question: "Apakah komisi berlaku berulang setiap bulan?",
    answer: "Iya, tergantung paket dan deal yang disepakati. Untuk komisi registrasi bersifat 1x (satu kali) per referral.",
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
  if (plan === "free" && (featureKey === "service.management" || featureKey === "retail.sales")) {
    return <span className="text-xs font-medium text-emerald-600">Pilih 1</span>;
  }

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
          <h1 className="text-3xl font-black tracking-tight">RMS Product Knowlage</h1>
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

        <section className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                  <RiStore2Line className="size-5" />
                </div>
                <CardTitle>Apa itu RMS?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-7">
              <p>
                RMS (Repair Management System) adalah <strong className="text-foreground">software operasional untuk toko servis HP</strong>.
                RMS menggantikan catatan manual yang berantakan, dan spreadsheet terpisah menjadi satu alur kerja terpadu.
              </p>
              <p className="mt-3">
                RMS bisa dipakai sebagai alur solo owner, team work dengan admin-staff-teknisi, atau retail/kasir untuk penjualan langsung.
                Semua tetap tercatat dan terlacak dalam satu dashboard.
              </p>
            </CardContent>
          </Card>

          {isAffiliate && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="inline-flex rounded-2xl bg-chart-3/10 p-3 text-chart-3">
                    <RiLinksLine className="size-5" />
                  </div>
                  <CardTitle>Referral Link Anda</CardTitle>
                </div>
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
          )}
        </section>

        <section>
          <div className="mb-6">
            <p className="text-sm font-medium text-primary">Workflow</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Tiga mode operasional yang mengikuti cara toko berjalan.
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              RMS tidak memaksa semua toko memakai alur besar. Pemilik toko bisa mulai sendiri, berkembang menjadi team work,
              lalu menambah use case retail saat inventory dan kasir dibutuhkan.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {workflowModes.map((mode) => {
              const ModeIcon = mode.icon;
              return (
                <Card key={mode.title} className="group transition-shadow hover:shadow-md">
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex rounded-2xl p-3 ${mode.accent}`}>
                        <ModeIcon className="size-5" />
                      </div>
                      <h3 className="text-base font-semibold">{mode.title}</h3>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{mode.audience}</p>
                    <div className="mt-4 flex flex-col gap-3">
                      {mode.steps.map((step, index) => (
                        <div key={step} className="flex gap-3 text-sm leading-6">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {index + 1}
                          </div>
                          <p className="text-muted-foreground">{step}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                  <CardContent className="flex gap-4">
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
                  <CardContent className="flex gap-4">
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
                  if (plan === "enterprise") {
                    return (
                      <TableRow key={plan}>
                        <TableCell><PlanLabelBadge plan={plan} /></TableCell>
                        <TableCell className="font-medium">Custom</TableCell>
                        <TableCell>Custom</TableCell>
                        <TableCell>Custom</TableCell>
                        <TableCell>Custom</TableCell>
                        <TableCell>Custom</TableCell>
                        <TableCell>—</TableCell>
                      </TableRow>
                    );
                  }
                  return (
                    <TableRow key={plan}>
                      <TableCell><PlanLabelBadge plan={plan} /></TableCell>
                      <TableCell className="font-medium">
                        {plan === "premium" ? (
                          <span className="text-xs font-semibold text-emerald-500">Coming soon</span>
                        ) : (
                          <>
                            {formatCurrency(config.monthlyPrice ?? 0)}
                            {config.additionalStorePrice ? (
                              <div className="text-xs text-muted-foreground">+{formatCurrency(config.additionalStorePrice)}/toko tambahan</div>
                            ) : null}
                          </>
                        )}
                      </TableCell>
                      <TableCell>{limitDisplay(config.includedStores, " toko")}</TableCell>
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

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent>
                <p className="text-xs font-medium text-emerald-500">Komisi Registrasi</p>
                <div className="mt-2 text-3xl font-bold">{formatCurrency(DEFAULT_REGISTER_COMMISSION)}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Setiap referral yang daftar — besaran komisi menyesuaikan potensi dan skala target customer.
                </p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent>
                <p className="text-xs font-medium text-blue-500">Komisi Pro</p>
                <div className="mt-2 text-3xl font-bold">Pasif</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Dapatkan kesempatan <strong>pasif income</strong> perbulan dari setiap referral Pro yang aktif.
                </p>
              </CardContent>
            </Card>
            <Card className="border-violet-500/20 bg-violet-500/5">
              <CardContent>
                <p className="text-xs font-medium text-violet-500">Komisi Enterprise</p>
                <div className="mt-2 text-3xl font-bold">{DEFAULT_ENTERPRISE_COMMISSION_PERCENT}%</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Setiap deal <strong>Enterprise</strong> yang berhasil direferensikan (harga custom).
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4 border-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-violet-500/[0.03] shadow-none">
            <CardContent>
              <h3 className="font-semibold">Cara kerja komisi</h3>
              <div className="mt-6 space-y-0">
                <div className="relative pl-10 pb-8">
                  <div className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                    <RiLinksLine className="size-4" />
                  </div>
                  <div className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-emerald-500/30 to-violet-500/30" />
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                    <p className="text-xs font-semibold text-emerald-500">Registrasi</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Customer daftar lewat <strong>link referral</strong> Anda — komisi registrasi default <strong>{formatCurrency(DEFAULT_REGISTER_COMMISSION)}</strong> dan bisa disesuaikan super admin.
                    </p>
                  </div>
                </div>
                <div className="relative pl-10 pb-8">
                  <div className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 ring-1 ring-violet-500/20">
                    <RiBarChartBoxLine className="size-4" />
                  </div>
                  <div className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-violet-500/30 to-blue-500/20" />
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
                    <p className="text-xs font-semibold text-violet-500">Upgrade</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Customer <strong>upgrade ke Enterprise</strong> — komisi satu kali <strong>{DEFAULT_ENTERPRISE_COMMISSION_PERCENT}%</strong>. Komisi Pro <strong>{DEFAULT_PRO_RECURRING_COMMISSION_PERCENT}%</strong> bersifat pasif per bulan selama customer aktif.
                    </p>
                  </div>
                </div>
                <div className="relative pl-10">
                  <div className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                    <RiCheckDoubleLine className="size-4" />
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold text-primary">Verifikasi</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Komisi dibuat, <strong>diverifikasi tim RMS</strong>, lalu dibayarkan.
                    </p>
                  </div>
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
                <CardContent>
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
                <CardContent>
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
