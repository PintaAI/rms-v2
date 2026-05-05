"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { TechnicianPerformanceDialog } from "@/components/dashboard/admin/technician-performance-dialog";
import { createKaryawan, deleteKaryawan } from "@/actions/karyawan";
import type { KaryawanItem, KaryawanStats } from "@/actions/karyawan";
import {
  RiUserLine,
  RiUserStarLine,
  RiAddLine,
  RiMailLine,
  RiLockPasswordLine,
  RiLoader4Line,
  RiDeleteBinLine,
  RiCheckLine,
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiFileListLine,
  RiFileCopyLine,
  RiInformationLine,
  RiSearchLine,
} from "@remixicon/react";
import { fuzzyScore } from "@/lib/fuzzy-search";

type StatsVariant = "default" | "primary" | "success" | "warning" | "accent";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  variant?: StatsVariant;
}

function PerformanceBadge({
  performance,
  role,
  onClick,
}: {
  performance: KaryawanItem["performance"];
  role: "staff" | "technician";
  onClick?: () => void;
}) {
  if (!performance) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  if (role === "staff") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950">
          <RiFileListLine className="size-3 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{performance.servicesCreated}</span>
        </div>
        <span className="text-xs text-muted-foreground">created (30d)</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      title="Lihat detail performance teknisi"
    >
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-950">
        <RiCheckboxCircleLine className="size-3 text-green-600 dark:text-green-400" />
        <span className="text-xs font-medium text-green-700 dark:text-green-300">{performance.servicesCompleted}</span>
      </div>
      {performance.servicesFailed > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950">
          <RiCloseCircleLine className="size-3 text-red-600 dark:text-red-400" />
          <span className="text-xs font-medium text-red-700 dark:text-red-300">{performance.servicesFailed}</span>
        </div>
      )}
      <span className="text-xs text-muted-foreground ml-1">Detail (30d)</span>
    </button>
  );
}

function StatsCard({ title, value, icon, description, variant = "default" }: StatsCardProps) {
  const bgStyles: Record<StatsVariant, string> = {
    default: "bg-card",
    primary: "bg-gradient-to-br from-primary/5 via-card to-primary/[0.02]",
    success: "bg-gradient-to-br from-chart-1/5 via-card to-chart-1/[0.02]",
    warning: "bg-gradient-to-br from-destructive/5 via-card to-destructive/[0.02]",
    accent: "bg-gradient-to-br from-sky-500/5 via-card to-sky-500/[0.02]",
  };

  const accentColors: Record<StatsVariant, string> = {
    default: "bg-border",
    primary: "bg-primary",
    success: "bg-chart-1",
    warning: "bg-destructive",
    accent: "bg-sky-500",
  };

  const iconBgStyles: Record<StatsVariant, string> = {
    default: "bg-muted",
    primary: "bg-primary/10",
    success: "bg-chart-1/10",
    warning: "bg-destructive/10",
    accent: "bg-sky-500/10",
  };

  const iconTextStyles: Record<StatsVariant, string> = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-chart-1",
    warning: "text-destructive",
    accent: "text-sky-500",
  };

  return (
    <div
      className={`relative ${bgStyles[variant]} rounded-xl border border-border/50 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 hover:border-border/80`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${accentColors[variant]} transition-all duration-300 opacity-80 group-hover:w-1.5 group-hover:opacity-100`} />
      <div className={`absolute top-3 right-3 w-8 h-8 rounded-md ${iconBgStyles[variant]} flex items-center justify-center ${iconTextStyles[variant]} transition-all duration-300 group-hover:scale-115 group-hover:rounded-lg`}>
        {icon}
      </div>
      <div className={`absolute top-0 right-0 w-20 h-20 ${accentColors[variant]}/5 rounded-full blur-2xl transition-all duration-300 group-hover:w-28 group-hover:h-28 group-hover:opacity-80`} />
      <div className="pl-5 pr-4 pt-5 pb-5 relative z-10">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest transition-colors duration-300 group-hover:text-muted-foreground/90">{title}</p>
        <div className="mt-2 text-3xl font-black tracking-tight text-foreground tabular-nums transition-transform duration-300 group-hover:scale-[1.02]">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground/80 mt-1.5 flex items-center gap-1 transition-colors duration-300 group-hover:text-muted-foreground/90">
            <RiArrowRightLine className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            {description}
          </p>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-px ${accentColors[variant]}/20 transition-all duration-300 group-hover:h-0.5 group-hover:opacity-40`} />
    </div>
  );
}

const sanitizeForEmail = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

interface ManageKaryawanProps {
  initialKaryawan: KaryawanItem[];
  initialStats: KaryawanStats;
  tokoId: string;
  tokoName?: string;
  initialSearchQuery?: string;
}

export function ManageKaryawan({
  initialKaryawan,
  initialStats,
  tokoId,
  tokoName = "toko",
  initialSearchQuery = "",
}: ManageKaryawanProps) {
  const [karyawan, setKaryawan] = useState<KaryawanItem[]>(initialKaryawan);
  const [stats, setStats] = useState<KaryawanStats>(initialStats);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KaryawanItem | null>(null);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<KaryawanItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    role: "staff" as "staff" | "technician",
  });

  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  const generatedEmailPreview =
    formData.name.trim() && tokoName
      ? `${sanitizeForEmail(formData.name)}-${formData.role}@${sanitizeForEmail(tokoName)}.com`
      : null;

  const filteredKaryawan = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return karyawan;

    return karyawan
      .map((item) => {
        const targets = [item.name, item.email, item.role, item.role === "technician" ? "teknisi" : "staff"];
        const score = targets.reduce<number | null>((bestScore, target) => {
          const currentScore = fuzzyScore(trimmedQuery, target);
          if (currentScore === null) return bestScore;
          return bestScore === null ? currentScore : Math.max(bestScore, currentScore);
        }, null);

        return { item, score };
      })
      .filter((entry): entry is { item: KaryawanItem; score: number } => entry.score !== null)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.item.name.localeCompare(b.item.name);
      })
      .map((entry) => entry.item);
  }, [karyawan, searchQuery]);

  const resetForm = () => {
    setFormData({ name: "", password: "", role: "staff" });
    setError(null);
    setSuccess(null);
  };

  const handleAddKaryawan = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await createKaryawan(tokoId, formData);

    if (!result.success) {
      setError(result.error || "Failed to add karyawan");
      setIsSubmitting(false);
      return;
    }

    if (result.data) {
      setKaryawan((prev) => [...prev, result.data!]);
      setStats((prev) => ({
        ...prev,
        [formData.role]: prev[formData.role] + 1,
        total: prev.total + 1,
      }));
      setCreatedCredentials({
        name: result.data.name,
        email: result.data.email,
        password: formData.password,
      });
      setCredentialsDialogOpen(true);
    }

    setIsSubmitting(false);
    setAddDialogOpen(false);
    resetForm();
  }, [tokoId, formData]);

  const handleDeleteClick = (item: KaryawanItem) => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const handlePerformanceClick = (item: KaryawanItem) => {
    if (item.role !== "technician") return;

    setSelectedTechnician(item);
    setPerformanceDialogOpen(true);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const result = await deleteKaryawan(tokoId, deleteTarget.id);

    if (!result.success) {
      setError(result.error || "Failed to delete karyawan");
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      return;
    }

    setKaryawan((prev) => prev.filter((k) => k.id !== deleteTarget.id));
    setStats((prev) => ({
      ...prev,
      [deleteTarget.role]: prev[deleteTarget.role] - 1,
      total: prev.total - 1,
    }));

    setSuccess("Karyawan berhasil dihapus");
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setTimeout(() => setSuccess(null), 3000);
  }, [tokoId, deleteTarget]);

  return (
    <div className="space-y-8">
      {success && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-sm flex items-center gap-2">
          <RiCheckLine className="size-4" />
          {success}
        </div>
      )}

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Staff"
            value={stats.staff}
            icon={<RiUserLine className="h-4 w-4" />}
            description="karyawan staff"
            variant="primary"
          />
          <StatsCard
            title="Technician"
            value={stats.technician}
            icon={<RiUserStarLine className="h-4 w-4" />}
            description="teknisi"
            variant="accent"
          />
          <StatsCard
            title="Total"
            value={stats.total}
            icon={<RiUserLine className="h-4 w-4" />}
            description="semua karyawan"
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 bg-primary rounded-full" />
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Daftar Karyawan</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari karyawan..."
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
            >
              <RiAddLine className="h-4 w-4 mr-1.5" />
              Tambah Karyawan
            </Button>
          </div>
        </div>

        <Card className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Nama</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Email</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Performance</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest w-[80px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKaryawan.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {searchQuery.trim() ? "Tidak ada karyawan yang cocok dengan pencarian" : "Belum ada karyawan. Klik \"Tambah Karyawan\" untuk menambah."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKaryawan.map((item) => (
                    <TableRow key={item.id} className="border-border/50">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            item.role === "staff"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          }`}
                        >
                          {item.role === "staff" ? "Staff" : "Technician"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PerformanceBadge
                          performance={item.performance}
                          role={item.role}
                          onClick={item.role === "technician" ? () => handlePerformanceClick(item) : undefined}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteClick(item)}
                        >
                          <RiDeleteBinLine className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Karyawan</DialogTitle>
            <DialogDescription>
              Isi data karyawan baru untuk menambahkan ke toko.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Field>
              <FieldLabel>Nama</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nama karyawan"
                    className="pl-10"
                  />
                  <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                {generatedEmailPreview && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <RiMailLine className="size-3 shrink-0" />
                    <span className="font-mono text-[11px]">{generatedEmailPreview}</span>
                  </p>
                )}
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Password</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Password"
                    className="pl-10"
                  />
                  <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Role</FieldLabel>
              <FieldContent>
                <div className="flex gap-2">
                  <Button
                    variant={formData.role === "staff" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, role: "staff" }))}
                    className="flex-1"
                  >
                    Staff
                  </Button>
                  <Button
                    variant={formData.role === "technician" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, role: "technician" }))}
                    className="flex-1"
                  >
                    Technician
                  </Button>
                </div>
              </FieldContent>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddKaryawan} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  Menambah...
                </>
              ) : (
                "Tambah"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={credentialsDialogOpen} onOpenChange={(open) => {
        setCredentialsDialogOpen(open);
        if (!open) setCreatedCredentials(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Akun Berhasil Dibuat</DialogTitle>
            <DialogDescription>
              Simpan informasi berikut dan kirimkan ke <strong>{createdCredentials?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {createdCredentials && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Email</p>
                    <p className="text-sm font-mono">{createdCredentials.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => navigator.clipboard.writeText(createdCredentials.email)}
                    title="Salin email"
                  >
                    <RiFileCopyLine className="size-4" />
                  </Button>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Password</p>
                    <p className="text-sm font-mono">{createdCredentials.password}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => navigator.clipboard.writeText(createdCredentials.password)}
                    title="Salin password"
                  >
                    <RiFileCopyLine className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
                <RiInformationLine className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Pastikan Anda menyimpan informasi ini. Password tidak dapat dilihat kembali setelah dialog ini ditutup.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => {
              setCredentialsDialogOpen(false);
              setCreatedCredentials(null);
            }}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TechnicianPerformanceDialog
        open={performanceDialogOpen}
        onOpenChange={(open) => {
          setPerformanceDialogOpen(open);
          if (!open) setSelectedTechnician(null);
        }}
        technician={selectedTechnician}
        tokoId={tokoId}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Karyawan"
        description={`Apakah Anda yakin ingin menghapus &quot;${deleteTarget?.name}&quot;? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
