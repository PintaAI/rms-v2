"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RiArchiveStackLine,
  RiBankCard2Line,
  RiBox3Line,
  RiErrorWarningLine,
  RiFileListLine,
  RiLoader4Line,
  RiSettings4Line,
  RiShieldUserLine,
  RiShoppingBag3Line,
  RiSmartphoneLine,
  RiUserLine,
  RiWhatsappLine,
} from "@remixicon/react";
import type { KaryawanPermissionSettings } from "@/actions/karyawan";
import type { PermissionKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { PermissionDraftEffect } from "./types";
import {
  getPermissionGroupLabel,
  getEffectiveAllowed,
  getPermissionHint,
} from "./permission-utils";

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissionTarget: { name: string; role: string } | null;
  permissionSettings: KaryawanPermissionSettings | null;
  permissionDraft: Record<PermissionKey, PermissionDraftEffect> | null;
  isLoadingPermissions: boolean;
  isSavingPermissions: boolean;
  isResettingPermissions: boolean;
  permissionError: string | null;
  onDraftChange: (permissionKey: PermissionKey, effect: PermissionDraftEffect) => void;
  onSave: () => void;
  onReset: () => void;
}

type PermissionGroup = [string, KaryawanPermissionSettings["permissions"]];

type PermissionPresetKey = "retail-cashier" | "service-only" | "full-access" | "full-safe";

const PERMISSION_PRESETS: { key: PermissionPresetKey; label: string; description: string }[] = [
  {
    key: "retail-cashier",
    label: "Kasir Retail",
    description: "Akses minimal untuk transaksi retail.",
  },
  {
    key: "service-only",
    label: "Service Only",
    description: "Akses operasional untuk handle service.",
  },
  {
    key: "full-access",
    label: "Full Access",
    description: "Aktifkan semua permission yang tersedia.",
  },
  {
    key: "full-safe",
    label: "Full Non-sensitive",
    description: "Semua akses operasional tanpa data sensitif.",
  },
];

const RETAIL_CASHIER_PERMISSION_KEYS = new Set<PermissionKey>([
  "dashboard.view",
  "dashboard.search",
  "retail.view",
  "retail.sell",
]);

const SERVICE_ONLY_PERMISSION_KEYS = new Set<PermissionKey>([
  "dashboard.view",
  "dashboard.search",
  "service.view",
  "service.create",
  "service.update",
  "service.updateStatus",
  "service.pickup",
  "service.assignTechnician",
  "service.takeOverTask",
  "service.createInvoice",
  "service.manageItems",
  "service.manageInvoice",
  "inventory.managePhoneUnits",
  "inventory.view",
  "warranty.create",
  "warranty.resolve",
]);

function isPermissionAllowedByPreset(
  presetKey: PermissionPresetKey,
  permission: KaryawanPermissionSettings["permissions"][number],
) {
  if (presetKey === "full-access") return true;
  if (presetKey === "full-safe") return permission.sensitivity === "operational";
  if (presetKey === "retail-cashier") return RETAIL_CASHIER_PERMISSION_KEYS.has(permission.permissionKey);
  if (presetKey === "service-only") return SERVICE_ONLY_PERMISSION_KEYS.has(permission.permissionKey);

  return false;
}

type PermissionNavSection = {
  label: string;
  icon: ReactNode;
  items: {
    groupLabel: string;
    label: string;
    icon: ReactNode;
    permissions: KaryawanPermissionSettings["permissions"];
  }[];
};

function getPermissionNavMeta(groupLabel: string) {
  if (groupLabel.startsWith("Inventory - ")) {
    const childLabel = groupLabel.replace("Inventory - ", "");

    return {
      sectionLabel: "Inventory",
      sectionIcon: <RiArchiveStackLine />,
      itemLabel: childLabel,
      itemIcon: getPermissionGroupIcon(childLabel),
    };
  }

  return {
    sectionLabel: groupLabel,
    sectionIcon: getPermissionGroupIcon(groupLabel),
    itemLabel: groupLabel,
    itemIcon: getPermissionGroupIcon(groupLabel),
  };
}

function buildPermissionNavSections(permissionGroups: PermissionGroup[]): PermissionNavSection[] {
  const sections = new Map<string, PermissionNavSection>();

  for (const [groupLabel, permissions] of permissionGroups) {
    const meta = getPermissionNavMeta(groupLabel);
    const section: PermissionNavSection = sections.get(meta.sectionLabel) ?? {
      label: meta.sectionLabel,
      icon: meta.sectionIcon,
      items: [],
    };

    section.items.push({
      groupLabel,
      label: meta.itemLabel,
      icon: meta.itemIcon,
      permissions,
    });
    sections.set(meta.sectionLabel, section);
  }

  return Array.from(sections.values());
}

function getPermissionGroupIcon(groupLabel: string): ReactNode {
  const label = groupLabel.toLowerCase();

  if (label.includes("sparepart")) return <RiBox3Line />;
  if (label.includes("aksesoris") || label.includes("retail")) return <RiShoppingBag3Line />;
  if (label.includes("katalog hp") || label.includes("phone") || label.includes("hp")) return <RiSmartphoneLine />;
  if (label.includes("user") || label.includes("karyawan")) return <RiUserLine />;
  if (label.includes("whatsapp")) return <RiWhatsappLine />;
  if (label.includes("harga") || label.includes("billing") || label.includes("bayar")) return <RiBankCard2Line />;
  if (label.includes("laporan") || label.includes("service") || label.includes("transaksi")) return <RiFileListLine />;
  if (label.includes("admin") || label.includes("permission") || label.includes("akses")) return <RiShieldUserLine />;

  return <RiSettings4Line />;
}

export function PermissionDialog({
  open,
  onOpenChange,
  permissionTarget,
  permissionSettings,
  permissionDraft,
  isLoadingPermissions,
  isSavingPermissions,
  isResettingPermissions,
  permissionError,
  onDraftChange,
  onSave,
  onReset,
}: PermissionDialogProps) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const availablePermissions = useMemo(
    () => permissionSettings?.permissions.filter((permission) => permission.requiredFeatureAvailable) ?? [],
    [permissionSettings],
  );

  const permissionGroups = useMemo(() => {
    const grouped = new Map<string, KaryawanPermissionSettings["permissions"]>();
    for (const permission of availablePermissions) {
      const groupLabel = getPermissionGroupLabel(permission);
      const current = grouped.get(groupLabel) ?? [];
      current.push(permission);
      grouped.set(groupLabel, current);
    }

    return Array.from(grouped.entries());
  }, [availablePermissions]);

  const activePermissionGroup = permissionGroups.find(([groupLabel]) => groupLabel === activeGroup) ?? permissionGroups[0];
  const permissionNavSections = useMemo(() => buildPermissionNavSections(permissionGroups), [permissionGroups]);
  const matchingPreset = useMemo(() => {
    if (!permissionDraft || availablePermissions.length === 0) return null;

    return PERMISSION_PRESETS.find((preset) =>
      availablePermissions.every((permission) => {
        const allowedByDraft = getEffectiveAllowed(
          permission.defaultAllowed,
          permissionDraft[permission.permissionKey] ?? "default",
        );
        return allowedByDraft === isPermissionAllowedByPreset(preset.key, permission);
      }),
    ) ?? null;
  }, [availablePermissions, permissionDraft]);

  const handleCheckedChange = (
    permission: KaryawanPermissionSettings["permissions"][number],
    checked: boolean,
  ) => {
    const effect: PermissionDraftEffect =
      checked === permission.defaultAllowed ? "default" : checked ? "allow" : "deny";
    onDraftChange(permission.permissionKey, effect);
  };

  const handlePresetChange = (presetKey: PermissionPresetKey) => {
    for (const permission of availablePermissions) {
      const allowed = isPermissionAllowedByPreset(presetKey, permission);

      const effect: PermissionDraftEffect =
        allowed === permission.defaultAllowed ? "default" : allowed ? "allow" : "deny";
      onDraftChange(permission.permissionKey, effect);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(640px,90vh)] w-[calc(100%-1rem)] overflow-hidden p-0 sm:max-w-4xl" showCloseButton>
        <DialogHeader className="sr-only">
          <DialogTitle>Permission — {permissionTarget?.name}</DialogTitle>
          <DialogDescription>
            Atur akses khusus untuk {permissionTarget?.name}. Default mengikuti role{" "}
            {permissionTarget?.role === "technician" ? "Technician" : "Staff"}.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPermissions ? (
          <div className="flex h-full items-center justify-center">
            <RiLoader4Line className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : permissionSettings && permissionDraft ? (
          <div className="flex min-h-0 h-full flex-col md:flex-row">
            <nav className="flex shrink-0 flex-col border-b bg-sidebar text-sidebar-foreground md:min-h-0 md:w-[220px] md:border-b-0 md:border-r">
              <div className="border-b px-4 py-4">
                <div className="text-xs text-sidebar-foreground/70">Akses-Control</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {permissionTarget?.name}
                  </div>
                  {permissionTarget && (
                    <Badge variant="outline" className="shrink-0">
                      {permissionTarget.role === "technician" ? "Technician" : "Staff"}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex min-h-0 gap-1 overflow-x-auto px-2 pb-3 md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:px-2 md:pb-2">
                {permissionNavSections.map((section) =>
                  section.items.length > 1 ? (
                    <div key={section.label} className="flex shrink-0 flex-col gap-1 md:w-full">
                      <div className="flex h-8 items-center gap-2 px-3 text-xs font-semibold text-sidebar-foreground/80">
                        <span className="[&>svg]:size-4 [&>svg]:shrink-0">{section.icon}</span>
                        <span className="truncate">{section.label}</span>
                        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                          {section.items.reduce((total, item) => total + item.permissions.length, 0)}
                        </Badge>
                      </div>
                      <div className="flex gap-1 md:flex-col">
                        {section.items.map((item) => (
                          <button
                            key={item.groupLabel}
                            type="button"
                            onClick={() => setActiveGroup(item.groupLabel)}
                            className={cn(
                              "relative flex h-8 shrink-0 items-center gap-2 overflow-hidden rounded-lg px-3 text-left text-xs whitespace-nowrap transition-all hover:bg-primary/10 hover:text-primary md:w-full md:pl-8",
                              activePermissionGroup?.[0] === item.groupLabel &&
                                "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent font-semibold text-foreground shadow-sm",
                            )}
                          >
                            <span className="[&>svg]:size-4 [&>svg]:shrink-0">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                            <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                              {item.permissions.length}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    section.items.map((item) => (
                      <button
                        key={item.groupLabel}
                        type="button"
                        onClick={() => setActiveGroup(item.groupLabel)}
                        className={cn(
                          "relative flex h-9 shrink-0 items-center gap-2 overflow-hidden rounded-lg px-3 text-left text-xs whitespace-nowrap transition-all hover:bg-primary/10 hover:text-primary md:w-full",
                          activePermissionGroup?.[0] === item.groupLabel &&
                            "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent font-semibold text-foreground shadow-sm",
                        )}
                      >
                        <span className="[&>svg]:size-4 [&>svg]:shrink-0">{section.icon}</span>
                        <span className="truncate">{item.label}</span>
                        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                          {item.permissions.length}
                        </Badge>
                      </button>
                    ))
                  ),
                )}
              </div>
            </nav>

            <TooltipProvider>
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 p-4 pb-3 md:p-6 md:pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-1 rounded-full bg-primary" />
                    <h2 className="font-heading text-sm font-medium">
                      {activePermissionGroup?.[0] ?? "Permission"}
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Default mengikuti role {permissionTarget?.role === "technician" ? "Technician" : "Staff"}.
                  </p>
                </div>

                {permissionError && (
                  <div className="mx-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive md:mx-6">
                    {permissionError}
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-2 md:p-6 md:pt-3">
                  {activePermissionGroup && (
                    <div className="flex flex-col gap-2">
                      <div className="divide-y divide-border/50 rounded-lg border border-border/50">
                        {activePermissionGroup[1].map((permission) => {
                          const draftEffect = permissionDraft[permission.permissionKey] ?? "default";
                          const effectiveAllowed = getEffectiveAllowed(permission.defaultAllowed, draftEffect);
                          const disabled = !permission.requiredFeatureAvailable;
                          const hint = getPermissionHint(permission, draftEffect);

                          return (
                            <label
                              key={permission.permissionKey}
                              className={cn(
                                "flex items-start gap-3 p-3 transition-colors",
                                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/40",
                              )}
                            >
                              <Checkbox
                                checked={effectiveAllowed}
                                onCheckedChange={(checked) => handleCheckedChange(permission, checked === true)}
                                disabled={disabled}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-semibold">{permission.label}</p>
                                  {hint && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="mt-0.5 inline-flex text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300">
                                          <RiErrorWarningLine className="size-4" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="left">
                                        {hint}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-2  p-4 sm:flex-row sm:justify-end">
                  <div className="sm:mr-auto">
                    <Select
                      disabled={!permissionSettings || !permissionDraft || isSavingPermissions || isResettingPermissions}
                      value={matchingPreset?.key ?? "custom"}
                      onValueChange={(value) => handlePresetChange(value as PermissionPresetKey)}
                    >
                      <SelectTrigger className="w-full sm:w-[190px]">
                        <SelectValue placeholder="Pilih Preset">
                          {matchingPreset?.label ?? "Custom"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="custom" disabled>
                            Custom
                          </SelectItem>
                          {PERMISSION_PRESETS.map((preset) => (
                            <SelectItem key={preset.key} value={preset.key} textValue={preset.label}>
                              <span className="flex flex-col gap-0.5 py-0.5 pr-4">
                                <span>{preset.label}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {preset.description}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={onReset}
                    disabled={!permissionSettings || !permissionTarget || isResettingPermissions || isSavingPermissions}
                  >
                    {isResettingPermissions ? (
                      <>
                        <RiLoader4Line className="size-4 animate-spin" />
                        Reset...
                      </>
                    ) : (
                      "Reset ke Default"
                    )}
                  </Button>

                  <Button onClick={onSave} disabled={!permissionSettings || !permissionDraft || isSavingPermissions || isResettingPermissions}>
                    {isSavingPermissions ? (
                      <>
                        <RiLoader4Line className="size-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </main>
            </TooltipProvider>
          </div>
        ) : (
          <div className="m-6 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            Permission tidak dapat dimuat.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
