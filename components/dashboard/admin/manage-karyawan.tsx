"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@remixicon/react";

interface ManageKaryawanProps {
  initialKaryawan: KaryawanItem[];
  initialStats: KaryawanStats;
  tokoId: string;
}

function StatsCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export function ManageKaryawan({
  initialKaryawan,
  initialStats,
  tokoId,
}: ManageKaryawanProps) {
  const [karyawan, setKaryawan] = useState<KaryawanItem[]>(initialKaryawan);
  const [stats, setStats] = useState<KaryawanStats>(initialStats);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KaryawanItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff" as "staff" | "technician",
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "", role: "staff" });
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
    }

    setSuccess("Karyawan berhasil ditambahkan");
    setIsSubmitting(false);
    setAddDialogOpen(false);
    resetForm();
    setTimeout(() => setSuccess(null), 3000);
  }, [tokoId, formData]);

  const handleDeleteClick = (item: KaryawanItem) => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
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
    <div className="space-y-6">
      {success && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-sm flex items-center gap-2">
          <RiCheckLine className="size-4" />
          {success}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Staff" value={stats.staff} icon={<RiUserLine className="size-4" />} />
        <StatsCard
          title="Technician"
          value={stats.technician}
          icon={<RiUserStarLine className="size-4" />}
        />
        <StatsCard title="Total" value={stats.total} icon={<RiUserLine className="size-4" />} />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Daftar Karyawan</h2>
        <Button onClick={() => setAddDialogOpen(true)}>
          <RiAddLine className="size-4" />
          Tambah Karyawan
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {karyawan.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Belum ada karyawan. Klik &quot;Tambah Karyawan&quot; untuk menambah.
                  </TableCell>
                </TableRow>
              ) : (
                karyawan.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
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
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Email</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    className="pl-10"
                  />
                  <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
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