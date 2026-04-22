"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  RiAlarmWarningLine,
  RiArchiveStackLine,
  RiCheckboxCircleLine,
  RiLoader4Line,
  RiPlayCircleLine,
  RiSearchLine,
  RiTimerFlashLine,
} from "@remixicon/react";

type AuditStatus = "pending" | "matched" | "discrepancy";
type SessionStatus = "idle" | "active" | "done";

type AuditItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  location: string;
  systemCount: number;
  actualCount: string;
  isAudited: boolean;
  lastAudit: string;
};

const initialItems: AuditItem[] = [
  {
    id: "sp-001",
    name: "LCD iPhone 11 Original Pull",
    sku: "LCD-IP11-OP",
    category: "Display",
    location: "Rak A1",
    systemCount: 12,
    actualCount: "",
    isAudited: false,
    lastAudit: "14 Apr 2026",
  },
  {
    id: "sp-002",
    name: "Baterai Redmi Note 10 BM4Y",
    sku: "BAT-RN10-BM4Y",
    category: "Power",
    location: "Rak A2",
    systemCount: 8,
    actualCount: "",
    isAudited: false,
    lastAudit: "11 Apr 2026",
  },
  {
    id: "sp-003",
    name: "Backdoor Samsung A14 Black",
    sku: "BD-A14-BLK",
    category: "Housing",
    location: "Rak B1",
    systemCount: 5,
    actualCount: "",
    isAudited: false,
    lastAudit: "09 Apr 2026",
  },
  {
    id: "sp-004",
    name: "Flexible Charging Oppo A57",
    sku: "FLEX-A57-CHG",
    category: "Connector",
    location: "Rak B2",
    systemCount: 14,
    actualCount: "",
    isAudited: false,
    lastAudit: "16 Apr 2026",
  },
  {
    id: "sp-005",
    name: "Kamera Belakang Vivo Y21",
    sku: "CAM-VY21-R",
    category: "Camera",
    location: "Rak C1",
    systemCount: 6,
    actualCount: "",
    isAudited: false,
    lastAudit: "12 Apr 2026",
  },
  {
    id: "sp-006",
    name: "Touchscreen Infinix Hot 12",
    sku: "TS-IH12",
    category: "Display",
    location: "Rak C3",
    systemCount: 10,
    actualCount: "",
    isAudited: false,
    lastAudit: "15 Apr 2026",
  },
  {
    id: "sp-007",
    name: "Socket SIM Xiaomi Poco X3",
    sku: "SIM-PX3",
    category: "Connector",
    location: "Laci 02",
    systemCount: 20,
    actualCount: "",
    isAudited: false,
    lastAudit: "08 Apr 2026",
  },
  {
    id: "sp-008",
    name: "Fingerprint Side Button Realme C25",
    sku: "FP-RC25-SB",
    category: "Biometric",
    location: "Laci 05",
    systemCount: 7,
    actualCount: "",
    isAudited: false,
    lastAudit: "13 Apr 2026",
  },
  {
    id: "sp-009",
    name: "Mainboard iPhone XR 128GB",
    sku: "MB-IPXR-128",
    category: "Mainboard",
    location: "Brankas 1",
    systemCount: 2,
    actualCount: "",
    isAudited: false,
    lastAudit: "10 Apr 2026",
  },
  {
    id: "sp-010",
    name: "Speaker Buzzer Samsung A03",
    sku: "SPK-SA03-BZ",
    category: "Audio",
    location: "Laci 07",
    systemCount: 16,
    actualCount: "",
    isAudited: false,
    lastAudit: "17 Apr 2026",
  },
  {
    id: "sp-011",
    name: "Lem B7000 15ml",
    sku: "LEM-B7000-15",
    category: "Tools",
    location: "Rak D1",
    systemCount: 24,
    actualCount: "",
    isAudited: false,
    lastAudit: "18 Apr 2026",
  },
  {
    id: "sp-012",
    name: "Tempered Glass Universal 6.5",
    sku: "TG-UNI-65",
    category: "Accessory",
    location: "Rak D3",
    systemCount: 30,
    actualCount: "",
    isAudited: false,
    lastAudit: "07 Apr 2026",
  },
];

function getItemStatus(item: AuditItem): AuditStatus {
  if (!item.isAudited) {
    return "pending";
  }

  return Number(item.actualCount) === item.systemCount ? "matched" : "discrepancy";
}

function formatElapsed(startedAt: number, now: number) {
  const diffSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatDateTime(timestamp: number | null) {
  if (!timestamp) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function statusBadgeVariant(status: AuditStatus) {
  if (status === "matched") {
    return "success" as const;
  }

  if (status === "discrepancy") {
    return "destructive" as const;
  }

  return "outline" as const;
}

function statusLabel(status: AuditStatus) {
  if (status === "matched") {
    return "Sesuai";
  }

  if (status === "discrepancy") {
    return "Selisih";
  }

  return "Pending";
}

type StatsCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone?: "primary" | "success" | "warning" | "neutral";
};

function StatsCard({ title, value, description, icon, tone = "neutral" }: StatsCardProps) {
  const toneStyles = {
    primary: "from-primary/10 via-card to-primary/[0.03] border-primary/20",
    success: "from-emerald-500/10 via-card to-emerald-500/[0.03] border-emerald-500/20",
    warning: "from-amber-500/10 via-card to-amber-500/[0.03] border-amber-500/20",
    neutral: "from-muted/80 via-card to-card border-border/60",
  };

  const iconStyles = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    neutral: "bg-muted text-muted-foreground",
  };

  return (
    <Card className={cn("border bg-gradient-to-br py-0 shadow-sm", toneStyles[tone])}>
      <CardContent className="flex items-start justify-between gap-4 px-4 py-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
          <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconStyles[tone])}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function AuditGudangMock({ tokoId }: { tokoId: string }) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AuditStatus>("all");
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    if (sessionStatus !== "active") {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [sessionStatus]);

  const stats = useMemo(() => {
    const audited = items.filter((item) => item.isAudited).length;
    const matched = items.filter((item) => getItemStatus(item) === "matched").length;
    const discrepancy = items.filter((item) => getItemStatus(item) === "discrepancy").length;
    const pending = items.length - audited;
    const progress = items.length === 0 ? 0 : Math.round((audited / items.length) * 100);

    return {
      total: items.length,
      audited,
      matched,
      discrepancy,
      pending,
      progress,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase();

    return items.filter((item) => {
      const status = getItemStatus(item);
      const matchesStatus = statusFilter === "all" ? true : status === statusFilter;
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  const discrepancyItems = useMemo(
    () => items.filter((item) => getItemStatus(item) === "discrepancy"),
    [items]
  );

  const handleStartAudit = () => {
    setSessionStatus("active");
    setStartedAt(Date.now());
    setCompletedAt(null);
    setNow(Date.now());
  };

  const handleResetAudit = () => {
    setSessionStatus("idle");
    setStartedAt(null);
    setCompletedAt(null);
    setNow(Date.now());
    setItems(initialItems);
    setSearch("");
    setStatusFilter("all");
  };

  const handleCompleteAudit = () => {
    setSessionStatus("done");
    setCompletedAt(Date.now());
  };

  const updateActualCount = (id: string, value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, actualCount: value, isAudited: value !== "" } : item))
    );
  };

  const markAudited = (id: string) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id || item.actualCount === "") {
          return item;
        }

        return { ...item, isAudited: true };
      })
    );
  };

  const elapsedLabel = startedAt ? formatElapsed(startedAt, now) : "00:00:00";
  const canFinalize = sessionStatus === "active" && stats.audited > 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60 bg-[radial-gradient(circle_at_top_right,rgba(var(--primary),0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_42%)] py-0 shadow-sm">
        <CardContent className="grid gap-6 px-5 py-5 lg:grid-cols-[1.5fr_1fr] lg:px-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
                Audit Cycle April
              </Badge>
              <Badge variant="outline">Toko {tokoId}</Badge>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-foreground">Audit fisik stok gudang tanpa ganggu operasional harian</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Mock UI ini membantu admin membandingkan stok sistem dengan hitungan fisik per rak, menandai selisih lebih cepat, dan memantau progres audit dalam satu sesi kerja.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Mulai audit</p>
                <p className="mt-1 text-sm font-semibold">Scan rak per zona</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Bandingkan</p>
                <p className="mt-1 text-sm font-semibold">Auto deteksi selisih</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tutup sesi</p>
                <p className="mt-1 text-sm font-semibold">Review item bermasalah</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-background/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Status sesi</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={sessionStatus === "done" ? "success" : sessionStatus === "active" ? "default" : "outline"}>
                    {sessionStatus === "idle" ? "Belum dimulai" : sessionStatus === "active" ? "Sedang berjalan" : "Selesai"}
                  </Badge>
                  {sessionStatus === "active" && <RiLoader4Line className="h-4 w-4 animate-spin text-primary" />}
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <RiTimerFlashLine className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">Mulai</span>
                <span className="font-medium">{formatDateTime(startedAt)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">Selesai</span>
                <span className="font-medium">{formatDateTime(completedAt)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">Durasi</span>
                <span className="font-mono font-semibold">{elapsedLabel}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleStartAudit} disabled={sessionStatus === "active"}>
                <RiPlayCircleLine className="mr-1.5 h-4 w-4" />
                Start Audit
              </Button>
              <Button variant="outline" onClick={handleCompleteAudit} disabled={!canFinalize}>
                <RiCheckboxCircleLine className="mr-1.5 h-4 w-4" />
                Complete Audit
              </Button>
              <Button variant="ghost" onClick={handleResetAudit}>
                Reset Mock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total item"
          value={String(stats.total)}
          description="sparepart masuk audit cycle"
          icon={<RiArchiveStackLine className="h-5 w-5" />}
          tone="primary"
        />
        <StatsCard
          title="Sudah diaudit"
          value={`${stats.audited}/${stats.total}`}
          description={`${stats.progress}% checklist selesai`}
          icon={<RiCheckboxCircleLine className="h-5 w-5" />}
          tone="success"
        />
        <StatsCard
          title="Temuan selisih"
          value={String(stats.discrepancy)}
          description={stats.discrepancy > 0 ? "perlu investigasi stok" : "belum ada mismatch"}
          icon={<RiAlarmWarningLine className="h-5 w-5" />}
          tone="warning"
        />
        <StatsCard
          title="Progress"
          value={`${stats.progress}%`}
          description={`${stats.pending} item belum dihitung`}
          icon={<RiTimerFlashLine className="h-5 w-5" />}
          tone="neutral"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
        <Card className="border-border/60 py-0 shadow-sm">
          <CardHeader className="gap-4 border-b border-border/60 px-5 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Daftar audit sparepart</CardTitle>
                <CardDescription>Input hitungan fisik untuk membandingkan stok di sistem dan stok di gudang.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "Semua" },
                  { key: "pending", label: "Pending" },
                  { key: "matched", label: "Sesuai" },
                  { key: "discrepancy", label: "Selisih" },
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={statusFilter === filter.key ? "default" : "outline"}
                    onClick={() => setStatusFilter(filter.key as "all" | AuditStatus)}
                    size="sm"
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="relative">
              <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama sparepart, SKU, atau lokasi rak"
                className="pl-9"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress audit sesi</span>
                <span>{stats.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.progress}%` }} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Sparepart</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead className="text-right">Stok Sistem</TableHead>
                    <TableHead className="w-[140px]">Hitung Fisik</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                        Tidak ada item yang cocok dengan filter saat ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => {
                      const status = getItemStatus(item);
                      const actualCount = item.actualCount === "" ? null : Number(item.actualCount);
                      const difference = actualCount === null ? null : actualCount - item.systemCount;

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            status === "discrepancy" && "bg-destructive/5 hover:bg-destructive/10",
                            status === "matched" && "bg-emerald-500/5 hover:bg-emerald-500/10"
                          )}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold text-foreground">{item.name}</div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{item.sku}</span>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span>{item.category}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              <p className="font-medium text-foreground">{item.location}</p>
                              <p className="text-muted-foreground">Audit terakhir {item.lastAudit}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold tabular-nums">{item.systemCount}</TableCell>
                          <TableCell>
                            <Input
                              inputMode="numeric"
                              value={item.actualCount}
                              onChange={(event) => updateActualCount(item.id, event.target.value)}
                              disabled={sessionStatus !== "active"}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {difference === null ? (
                              <span className="text-muted-foreground">-</span>
                            ) : difference === 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">0</span>
                            ) : (
                              <span className="text-destructive">{difference > 0 ? `+${difference}` : difference}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={status === "discrepancy" ? "destructive" : "outline"}
                              onClick={() => markAudited(item.id)}
                              disabled={sessionStatus !== "active" || item.actualCount === ""}
                            >
                              Audit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  Tidak ada item yang cocok dengan filter saat ini.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const status = getItemStatus(item);
                  const actualCount = item.actualCount === "" ? null : Number(item.actualCount);
                  const difference = actualCount === null ? null : actualCount - item.systemCount;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-2xl border p-4 shadow-sm",
                        status === "discrepancy" ? "border-destructive/30 bg-destructive/5" : "border-border/60 bg-card"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.sku} • {item.location}</p>
                        </div>
                        <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">Stok sistem</p>
                          <p className="mt-1 font-semibold tabular-nums">{item.systemCount}</p>
                        </div>
                        <div className="rounded-xl bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">Selisih</p>
                          <p className={cn("mt-1 font-semibold tabular-nums", difference ? "text-destructive" : "text-foreground")}>
                            {difference === null ? "-" : difference > 0 ? `+${difference}` : difference}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-3">
                        <Input
                          inputMode="numeric"
                          value={item.actualCount}
                          onChange={(event) => updateActualCount(item.id, event.target.value)}
                          disabled={sessionStatus !== "active"}
                          placeholder="Masukkan hitung fisik"
                        />
                        <Button
                          className="w-full"
                          variant={status === "discrepancy" ? "destructive" : "outline"}
                          onClick={() => markAudited(item.id)}
                          disabled={sessionStatus !== "active" || item.actualCount === ""}
                        >
                          Tandai sudah dicek
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Ringkasan cepat</CardTitle>
              <CardDescription>Prioritas audit untuk sesi mock yang sedang berjalan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold">{stats.pending} item</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Sesuai</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.matched} item</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2.5">
                <span className="text-muted-foreground">Butuh follow up</span>
                <span className="font-semibold text-destructive">{stats.discrepancy} item</span>
              </div>
              <div className="rounded-2xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                Setelah mock ini siap dihubungkan ke backend, blok ini bisa dipakai untuk approval supervisor, export hasil audit, dan penyesuaian stok otomatis.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Item dengan selisih</CardTitle>
              <CardDescription>Daftar ini otomatis terisi saat hitung fisik berbeda dari stok sistem.</CardDescription>
            </CardHeader>
            <CardContent>
              {discrepancyItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                  Belum ada selisih. Input hitung fisik di tabel untuk melihat state discrepancy.
                </div>
              ) : (
                <div className="space-y-3">
                  {discrepancyItems.map((item) => {
                    const difference = Number(item.actualCount) - item.systemCount;

                    return (
                      <div key={item.id} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.location} • {item.sku}</p>
                          </div>
                          <Badge variant="destructive">{difference > 0 ? `+${difference}` : difference}</Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-background/80 p-2">
                            <p className="text-muted-foreground">Sistem</p>
                            <p className="mt-1 font-semibold tabular-nums">{item.systemCount}</p>
                          </div>
                          <div className="rounded-xl bg-background/80 p-2">
                            <p className="text-muted-foreground">Fisik</p>
                            <p className="mt-1 font-semibold tabular-nums">{item.actualCount}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
