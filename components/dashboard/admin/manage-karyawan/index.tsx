"use client";

import { useState, useCallback } from "react";
import { RiCheckLine, RiUserLine, RiUserStarLine } from "@remixicon/react";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { TechnicianPerformanceDialog } from "@/components/dashboard/admin/technician-performance-dialog";
import {
  createKaryawan,
  deleteKaryawan,
  getKaryawanPermissionSettings,
  resetKaryawanPermissionOverrides,
  saveKaryawanPermissionOverrides,
} from "@/actions/karyawan";
import type { KaryawanItem, KaryawanPermissionSettings, SaveKaryawanPermissionOverrideInput } from "@/actions/karyawan";
import type { PermissionKey } from "@/lib/permissions";
import { StatsCard } from "./stats-card";
import { KaryawanTable } from "./karyawan-table";
import { AddKaryawanDialog } from "./add-karyawan-dialog";
import { CredentialsDialog } from "./credentials-dialog";
import { PermissionDialog } from "./permission-dialog";
import { buildPermissionDraft } from "./permission-utils";
import type { ManageKaryawanProps, PermissionDraftEffect, FormData } from "./types";

export function ManageKaryawan({
  initialKaryawan,
  initialStats,
  tokoId,
  tokoName = "toko",
  initialSearchQuery = "",
  actionPermissions = {
    canCreate: true,
    canDelete: true,
    canManagePermissions: true,
  },
}: ManageKaryawanProps) {
  const [karyawan, setKaryawan] = useState<KaryawanItem[]>(initialKaryawan);
  const [stats, setStats] = useState(initialStats);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KaryawanItem | null>(null);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<KaryawanItem | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState<KaryawanItem | null>(null);
  const [permissionSettings, setPermissionSettings] = useState<KaryawanPermissionSettings | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<Record<PermissionKey, PermissionDraftEffect> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isResettingPermissions, setIsResettingPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    password: "",
    role: "staff",
  });

  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

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

  const handlePerformanceClick = (item: KaryawanItem) => {
    if (item.role !== "technician") return;
    setSelectedTechnician(item);
    setPerformanceDialogOpen(true);
  };

  const handlePermissionClick = useCallback(async (item: KaryawanItem) => {
    setPermissionTarget(item);
    setPermissionDialogOpen(true);
    setPermissionSettings(null);
    setPermissionDraft(null);
    setError(null);
    setPermissionError(null);
    setIsLoadingPermissions(true);

    const result = await getKaryawanPermissionSettings(tokoId, item.id);
    setIsLoadingPermissions(false);

    if (!result.success || !result.data) {
      setPermissionError(result.error || "Gagal memuat permission karyawan");
      return;
    }

    setPermissionSettings(result.data);
    setPermissionDraft(buildPermissionDraft(result.data));
  }, [tokoId]);

  const handlePermissionDraftChange = (permissionKey: PermissionKey, effect: PermissionDraftEffect) => {
    setPermissionDraft((prev) => prev ? { ...prev, [permissionKey]: effect } : prev);
  };

  const handleSavePermissions = useCallback(async () => {
    if (!permissionTarget || !permissionSettings || !permissionDraft) return;

    setIsSavingPermissions(true);
    setPermissionError(null);

    const overrides: SaveKaryawanPermissionOverrideInput[] = permissionSettings.permissions.flatMap((permission) => {
      if (!permission.requiredFeatureAvailable) return [];

      const effect = permissionDraft[permission.permissionKey];
      return effect === "default" ? [] : [{ permissionKey: permission.permissionKey, effect }];
    });

    const result = await saveKaryawanPermissionOverrides(tokoId, permissionTarget.id, overrides);
    setIsSavingPermissions(false);

    if (!result.success || !result.data) {
      setPermissionError(result.error || "Gagal menyimpan permission karyawan");
      return;
    }

    setPermissionSettings(result.data);
    setPermissionDraft(buildPermissionDraft(result.data));
    setPermissionDialogOpen(false);
    setPermissionTarget(null);
    setSuccess("Permission karyawan berhasil disimpan");
    setTimeout(() => setSuccess(null), 3000);
  }, [permissionDraft, permissionSettings, permissionTarget, tokoId]);

  const handleResetPermissions = useCallback(async () => {
    if (!permissionTarget) return;

    setIsResettingPermissions(true);
    setPermissionError(null);

    const result = await resetKaryawanPermissionOverrides(tokoId, permissionTarget.id);
    setIsResettingPermissions(false);

    if (!result.success || !result.data) {
      setPermissionError(result.error || "Gagal reset permission karyawan");
      return;
    }

    setPermissionSettings(result.data);
    setPermissionDraft(buildPermissionDraft(result.data));
    setSuccess("Permission karyawan berhasil direset ke default role");
    setTimeout(() => setSuccess(null), 3000);
  }, [permissionTarget, tokoId]);

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

      <KaryawanTable
        karyawan={karyawan}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        actionPermissions={actionPermissions}
        onAddClick={() => setAddDialogOpen(true)}
        onDeleteClick={handleDeleteClick}
        onPermissionClick={handlePermissionClick}
        onPerformanceClick={handlePerformanceClick}
      />

      <AddKaryawanDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        formData={formData}
        onFormDataChange={setFormData}
        tokoName={tokoName}
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={handleAddKaryawan}
      />

      <CredentialsDialog
        open={credentialsDialogOpen}
        onOpenChange={(open) => {
          setCredentialsDialogOpen(open);
          if (!open) setCreatedCredentials(null);
        }}
        credentials={createdCredentials}
      />

      <TechnicianPerformanceDialog
        open={performanceDialogOpen}
        onOpenChange={(open) => {
          setPerformanceDialogOpen(open);
          if (!open) setSelectedTechnician(null);
        }}
        technician={selectedTechnician}
        tokoId={tokoId}
      />

      <PermissionDialog
        open={permissionDialogOpen}
        onOpenChange={(open) => {
          setPermissionDialogOpen(open);
          if (!open) {
            setPermissionTarget(null);
            setPermissionSettings(null);
            setPermissionDraft(null);
            setIsLoadingPermissions(false);
            setIsSavingPermissions(false);
            setIsResettingPermissions(false);
            setPermissionError(null);
          }
        }}
        permissionTarget={permissionTarget}
        permissionSettings={permissionSettings}
        permissionDraft={permissionDraft}
        isLoadingPermissions={isLoadingPermissions}
        isSavingPermissions={isSavingPermissions}
        isResettingPermissions={isResettingPermissions}
        permissionError={permissionError}
        onDraftChange={handlePermissionDraftChange}
        onSave={handleSavePermissions}
        onReset={handleResetPermissions}
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
