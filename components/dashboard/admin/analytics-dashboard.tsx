"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  RiArchiveLine,
  RiBarChartBoxLine,
  RiCheckDoubleLine,
  RiMoneyDollarCircleLine,
  RiPrinterLine,
  RiShoppingBag3Line,
  RiStore2Line,
  RiTimeLine,
  RiToolsLine,
} from "@remixicon/react";
import type { AdminAnalyticsData } from "@/actions/analytics";
import { AnalyticsFilter } from "@/components/dashboard/admin/analytics-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

const revenueChartConfig = {
  revenue: { label: "Lunas", color: "var(--chart-1)" },
  pending: { label: "Menunggu", color: "var(--chart-2)" },
} satisfies ChartConfig;

const serviceChartConfig = {
  services: { label: "Servis", color: "var(--chart-3)" },
  completed: { label: "Selesai", color: "var(--chart-1)" },
} satisfies ChartConfig;

const retailChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  transactions: { label: "Transaksi", color: "var(--chart-3)" },
} satisfies ChartConfig;

const statusChartConfig = {
  received: { label: "Masuk", color: "var(--chart-2)" },
  repairing: { label: "Proses", color: "var(--chart-3)" },
  done: { label: "Selesai", color: "var(--chart-1)" },
  failed: { label: "Gagal", color: "var(--chart-5)" },
} satisfies ChartConfig;

interface AdminAnalyticsDashboardProps {
  data: AdminAnalyticsData;
}

export function AdminAnalyticsDashboard({ data }: AdminAnalyticsDashboardProps) {
  const statusData = data.statusBreakdown.map((item) => ({
    ...item,
    fill: `var(--color-${item.status})`,
  }));
  const handlePrintReport = () => window.print();

  return (
    <div className="flex flex-col gap-6 print:mx-auto print:w-[190mm] print:max-w-none print:gap-3 print:text-[10px] lg:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight print:text-xl sm:text-3xl">Analitik</h1>
            <div className="h-5 w-1 shrink-0 rounded-full bg-primary sm:h-6" />
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 sm:bg-transparent sm:px-0 sm:py-0">
              {data.toko.logoUrl ? (
                <Image
                  src={data.toko.logoUrl}
                  alt={data.toko.name}
                  width={20}
                  height={20}
                  className="size-5 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
                  <RiStore2Line className="size-3 text-muted-foreground" />
                </div>
              )}
              <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">{data.toko.name}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground/70">
            <span>Wawasan performa toko untuk periode</span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-sm shadow-primary/5">
              {data.periodLabel}
            </span>
            {data.filters.allTime && (
              <span className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
                Semua waktu
              </span>
            )}
            {data.filters.status && (
              <span className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
                Status: {statusChartConfig[data.filters.status].label}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <AnalyticsFilter filters={data.filters} />
          <Button variant="outline" size="sm" onClick={handlePrintReport}>
            <RiPrinterLine data-icon="inline-start" />
            Cetak Laporan
          </Button>
          <Badge variant="warning" className="w-fit gap-1">
            <RiBarChartBoxLine className="size-3" />
            Analitik Lanjutan
          </Badge>
        </div>
      </div>

      <section className="grid gap-3 print:grid-cols-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          title="Total Pendapatan"
          value={formatCurrency(data.summary.totalRevenue)}
          description="Pelunasan service + retail paid"
          icon={<RiMoneyDollarCircleLine className="size-4" />}
          variant="success"
        />
        <AnalyticsMetricCard
          title="Pendapatan Bersih Estimasi"
          value={formatCurrency(data.summary.estimatedNetRevenue)}
          description="Service net + margin retail"
          icon={<RiBarChartBoxLine className="size-4" />}
          variant="primary"
        />
        <AnalyticsMetricCard
          title="Pendapatan Service"
          value={formatCurrency(data.summary.paidRevenue)}
          description={`${data.summary.paidInvoices} invoice setelah DP & diskon`}
          icon={<RiToolsLine className="size-4" />}
          variant="default"
        />
        <AnalyticsMetricCard
          title="Pendapatan Retail"
          value={formatCurrency(data.summary.retailRevenue)}
          description={data.retail.enabled ? `${data.retail.summary.transactions} transaksi paid` : "Retail belum aktif"}
          icon={<RiShoppingBag3Line className="size-4" />}
          variant="default"
        />
      </section>

      <Tabs defaultValue="service" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="service">Analytics Service</TabsTrigger>
          <TabsTrigger value="retail">Analytics Retail</TabsTrigger>
        </TabsList>

        <TabsContent value="service" className="flex flex-col gap-6 lg:gap-8">
      <section className="grid gap-3 print:grid-cols-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          title="Pendapatan Lunas"
          value={formatCurrency(data.summary.paidRevenue)}
          description={`${data.summary.paidInvoices} invoice setelah DP & diskon`}
          icon={<RiMoneyDollarCircleLine className="size-4" />}
          variant="success"
        />
        <AnalyticsMetricCard
          title="Pendapatan Tertunda"
          value={formatCurrency(data.summary.pendingRevenue)}
          description="Sisa tagihan belum lunas"
          icon={<RiTimeLine className="size-4" />}
          variant="warning"
        />
        <AnalyticsMetricCard
          title="Tingkat Penyelesaian"
          value={`${data.summary.completionRate}%`}
          description={`${data.summary.totalServices} servis periode ini`}
          icon={<RiCheckDoubleLine className="size-4" />}
          variant="primary"
        />
        <AnalyticsMetricCard
          title="Kesehatan Inventaris"
          value={`${data.summary.lowStockCount}`}
          description={`${data.summary.totalSpareparts} item, ${data.summary.totalStock} stok total`}
          icon={<RiArchiveLine className="size-4" />}
          variant={data.summary.lowStockCount > 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-4 print:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] print:gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
        <Card className="border-border/50 shadow-lg shadow-black/5 print:shadow-none">
          <CardHeader>
            <CardTitle>Tren Pendapatan</CardTitle>
            <CardDescription>
              Pendapatan lunas dan tertunda per {data.bucketMode === "month" ? "bulan" : "hari"} dalam periode terpilih.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[260px] w-full print:h-[145px]">
              <AreaChart accessibilityLayer data={data.trend} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => compactCurrency(Number(value))}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <>
                          <span className="text-muted-foreground">{revenueChartConfig[name as keyof typeof revenueChartConfig]?.label}</span>
                          <span className="ml-auto font-mono font-medium tabular-nums">
                            {formatCurrency(Number(value))}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <Area dataKey="pending" type="natural" fill="var(--color-pending)" fillOpacity={0.18} stroke="var(--color-pending)" />
                <Area dataKey="revenue" type="natural" fill="var(--color-revenue)" fillOpacity={0.28} stroke="var(--color-revenue)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg shadow-black/5 print:shadow-none">
          <CardHeader>
            <CardTitle>Status Servis</CardTitle>
            <CardDescription>Distribusi status servis periode ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusChartConfig} className="mx-auto h-[260px] w-full max-w-sm print:h-[145px]">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
                <Pie data={statusData} dataKey="count" nameKey="label" innerRadius={58} strokeWidth={4}>
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {statusData.map((item) => (
                <div key={item.status} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 print:grid-cols-3 print:gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)_minmax(20rem,0.75fr)]">
        <Card className="border-border/50 shadow-lg shadow-black/5 print:shadow-none">
          <CardHeader>
            <CardTitle>Tren Servis</CardTitle>
            <CardDescription>Servis masuk dibanding servis selesai.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={serviceChartConfig} className="h-[260px] w-full print:h-[145px]">
              <BarChart accessibilityLayer data={data.trend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="services" fill="var(--color-services)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg shadow-black/5 print:shadow-none">
          <CardHeader>
            <CardTitle>Teknisi Terbaik</CardTitle>
            <CardDescription>Berdasarkan servis selesai periode ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teknisi</TableHead>
                  <TableHead className="text-right">Selesai</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topTechnicians.length > 0 ? (
                  data.topTechnicians.map((technician) => (
                    <TableRow key={technician.id}>
                      <TableCell className="font-medium">{technician.name}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{technician.completedServices}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(technician.revenue)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Belum ada servis selesai dengan teknisi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg shadow-black/5 print:shadow-none">
          <CardHeader>
            <CardTitle>Sparepart Terlaris</CardTitle>
            <CardDescription>Berdasarkan invoice lunas periode ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sparepart</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topSpareparts.length > 0 ? (
                  data.topSpareparts.map((sparepart) => (
                    <TableRow key={sparepart.id}>
                      <TableCell className="font-medium">{sparepart.name}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{sparepart.qty}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(sparepart.revenue)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Belum ada sparepart dari invoice lunas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
        </TabsContent>

        <TabsContent value="retail" className="flex flex-col gap-6 lg:gap-8">
          {data.retail.enabled ? (
            <RetailAnalyticsContent data={data} />
          ) : (
            <Card className="border-border/50 shadow-lg shadow-black/5">
              <CardHeader>
                <CardTitle>Analytics Retail belum aktif</CardTitle>
                <CardDescription>Aktifkan fitur retail sales untuk melihat performa penjualan retail.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RetailAnalyticsContent({ data }: { data: AdminAnalyticsData }) {
  return (
    <>
      <section className="grid gap-3 print:grid-cols-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          title="Revenue Retail"
          value={formatCurrency(data.retail.summary.revenue)}
          description={`${data.retail.summary.transactions} transaksi paid`}
          icon={<RiMoneyDollarCircleLine className="size-4" />}
          variant="success"
        />
        <AnalyticsMetricCard
          title="Rata-rata Transaksi"
          value={formatCurrency(data.retail.summary.averageTransaction)}
          description="Average order value retail"
          icon={<RiShoppingBag3Line className="size-4" />}
          variant="primary"
        />
        <AnalyticsMetricCard
          title="Gross Margin"
          value={formatCurrency(data.retail.summary.grossMargin)}
          description="Estimasi dari cost snapshot"
          icon={<RiBarChartBoxLine className="size-4" />}
          variant="default"
        />
        <AnalyticsMetricCard
          title="Qty Terjual"
          value={String(data.retail.summary.totalQty)}
          description="Total item retail terjual"
          icon={<RiArchiveLine className="size-4" />}
          variant="default"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <Card className="border-border/50 shadow-lg shadow-black/5 print:shadow-none">
          <CardHeader>
            <CardTitle>Tren Retail</CardTitle>
            <CardDescription>Revenue retail dan jumlah transaksi per {data.bucketMode === "month" ? "bulan" : "hari"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={retailChartConfig} className="h-[260px] w-full print:h-[145px]">
              <AreaChart accessibilityLayer data={data.retail.trend} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => compactCurrency(Number(value))} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <>
                          <span className="text-muted-foreground">{retailChartConfig[name as keyof typeof retailChartConfig]?.label}</span>
                          <span className="ml-auto font-mono font-medium tabular-nums">
                            {name === "transactions" ? Number(value) : formatCurrency(Number(value))}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <Area dataKey="revenue" type="natural" fill="var(--color-revenue)" fillOpacity={0.28} stroke="var(--color-revenue)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg shadow-black/5 print:shadow-none">
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
            <CardDescription>Breakdown transaksi retail paid.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Transaksi</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.retail.paymentBreakdown.length > 0 ? data.retail.paymentBreakdown.map((payment) => (
                  <TableRow key={payment.method}>
                    <TableCell className="font-medium">{payment.label}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{payment.count}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(payment.revenue)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Belum ada transaksi retail paid.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <RetailTopItemsTable title="Item Terlaris" description="Berdasarkan qty terjual." items={data.retail.topItemsByQty} />
        <RetailTopItemsTable title="Revenue Item Tertinggi" description="Berdasarkan revenue retail." items={data.retail.topItemsByRevenue} />
      </section>
    </>
  );
}

function RetailTopItemsTable({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: AdminAnalyticsData["retail"]["topItemsByQty"];
}) {
  return (
    <Card className="border-border/50 shadow-lg shadow-black/5 print:shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.type === "retail_product" ? "Retail item" : "Sparepart"}</div>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{item.qty}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatCurrency(item.revenue)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatCurrency(item.grossMargin)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Belum ada item retail terjual.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface AnalyticsMetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  variant: "default" | "primary" | "success" | "warning";
}

const metricStyles: Record<AnalyticsMetricCardProps["variant"], string> = {
  default: "from-card via-card to-muted/30",
  primary: "from-primary/10 via-card to-primary/[0.03]",
  success: "from-chart-1/10 via-card to-chart-1/[0.03]",
  warning: "from-destructive/10 via-card to-destructive/[0.03]",
};

function AnalyticsMetricCard({ title, value, description, icon, variant }: AnalyticsMetricCardProps) {
  return (
    <Card className={`overflow-hidden border-border/50 bg-gradient-to-br ${metricStyles[variant]} shadow-lg shadow-black/5 print:shadow-none`}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2 print:p-3 print:pb-1">
        <div className="min-w-0">
          <CardDescription className="truncate text-[10px] font-semibold uppercase tracking-widest">{title}</CardDescription>
          <CardTitle className="mt-2 truncate text-2xl font-black tracking-tight tabular-nums print:text-base">{value}</CardTitle>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="print:px-3 print:pb-3">
        <p className="truncate text-xs text-muted-foreground/80">{description}</p>
      </CardContent>
    </Card>
  );
}

function compactCurrency(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return String(value);
}
