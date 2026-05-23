"use client";

import type { KaryawanItem, KaryawanStats, KaryawanPermissionSettings } from "@/actions/karyawan";
import type { PermissionEffect, PermissionKey } from "@/lib/permissions";

export type StatsVariant = "default" | "primary" | "success" | "warning" | "accent";
export type PermissionDraftEffect = PermissionEffect | "default";

export interface ActionPermissions {
  canCreate: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
}

export interface ManageKaryawanProps {
  initialKaryawan: KaryawanItem[];
  initialStats: KaryawanStats;
  tokoId: string;
  tokoName?: string;
  initialSearchQuery?: string;
  actionPermissions?: ActionPermissions;
}

export interface DialogStates {
  addDialogOpen: boolean;
  setAddDialogOpen: (open: boolean) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  deleteTarget: KaryawanItem | null;
  setDeleteTarget: (target: KaryawanItem | null) => void;
  performanceDialogOpen: boolean;
  setPerformanceDialogOpen: (open: boolean) => void;
  selectedTechnician: KaryawanItem | null;
  setSelectedTechnician: (target: KaryawanItem | null) => void;
  permissionDialogOpen: boolean;
  setPermissionDialogOpen: (open: boolean) => void;
  permissionTarget: KaryawanItem | null;
  setPermissionTarget: (target: KaryawanItem | null) => void;
  permissionSettings: KaryawanPermissionSettings | null;
  setPermissionSettings: (settings: KaryawanPermissionSettings | null) => void;
  permissionDraft: Record<PermissionKey, PermissionDraftEffect> | null;
  setPermissionDraft: (draft: Record<PermissionKey, PermissionDraftEffect> | null) => void;
  credentialsDialogOpen: boolean;
  setCredentialsDialogOpen: (open: boolean) => void;
  createdCredentials: { name: string; email: string; password: string } | null;
  setCreatedCredentials: (creds: { name: string; email: string; password: string } | null) => void;
}

export interface LoadingStates {
  isSubmitting: boolean;
  setIsSubmitting: (loading: boolean) => void;
  isDeleting: boolean;
  setIsDeleting: (loading: boolean) => void;
  isLoadingPermissions: boolean;
  setIsLoadingPermissions: (loading: boolean) => void;
  isSavingPermissions: boolean;
  setIsSavingPermissions: (loading: boolean) => void;
  isResettingPermissions: boolean;
  setIsResettingPermissions: (loading: boolean) => void;
}

export type RoleOption = "staff" | "technician";

export interface FormData {
  name: string;
  password: string;
  role: RoleOption;
}
