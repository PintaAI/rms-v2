"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/auth/auth-provider";
import { getTokoById, updateToko, deleteToko, createToko } from "@/actions/toko";
import { McpSettingsCard } from "@/components/dashboard/admin/mcp-settings-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { RiStore2Line, RiEditLine, RiDeleteBinLine, RiMapPinLine, RiPhoneLine, RiImageLine, RiLoader4Line, RiCloseLine, RiCheckLine, RiAddLine } from "@remixicon/react";

interface TokoDetail {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  invoiceTerms: string | null;
  invoiceWarranty: string | null;
  status: string;
}

export function ManageToko({ currentTokoId: tokoid }: { currentTokoId: string }) {
  const router = useRouter();
  const { tokoList, refetchTokoList } = useAuth();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedToko, setSelectedToko] = useState<TokoDetail | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editFormData, setEditFormData] = useState({
    name: "",
    address: "",
    phone: "",
    logoUrl: "",
    invoiceTerms: "",
    invoiceWarranty: "",
    status: "active" as "active" | "inactive",
  });
  const [createFormData, setCreateFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [createLogoPreview, setCreateLogoPreview] = useState<string | null>(null);

  const handleEdit = useCallback(async (tokoId: string) => {
    setEditError(null);
    setIsLoadingEdit(true);
    setEditDialogOpen(true);

    const result = await getTokoById(tokoId);
    if (result.success && result.data) {
      setSelectedToko(result.data);
      setEditFormData({
        name: result.data.name,
        address: result.data.address || "",
        phone: result.data.phone || "",
        logoUrl: result.data.logoUrl || "",
        invoiceTerms: result.data.invoiceTerms || "",
        invoiceWarranty: result.data.invoiceWarranty || "",
        status: result.data.status as "active" | "inactive",
      });
      setEditLogoPreview(result.data.logoUrl);
    } else {
      setEditError(result.error || "Failed to load toko details");
      setEditDialogOpen(false);
    }
    setIsLoadingEdit(false);
  }, []);

  const handleEditLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditLogoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditLogoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleCreateLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCreateLogoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCreateLogoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedToko) return;

    if (!editFormData.name.trim()) {
      setEditError("Toko name is required");
      return;
    }

    if (editFormData.name.trim().length < 2) {
      setEditError("Toko name must be at least 2 characters");
      return;
    }

    setIsLoadingEdit(true);
    setEditError(null);

    let logoUrl = editFormData.logoUrl || undefined;
    if (editLogoFile) {
      const formDataUpload = new FormData();
      formDataUpload.append("file", editLogoFile);
      formDataUpload.append("pathname", `logos/${Date.now()}-${editLogoFile.name}`);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (res.ok) {
          const result = await res.json();
          logoUrl = result.blob.url;
        }
      } catch (err) {
        console.error("Logo upload error:", err);
      }
    }

    const result = await updateToko(selectedToko.id, {
      name: editFormData.name.trim(),
      address: editFormData.address.trim() || undefined,
      phone: editFormData.phone.trim() || undefined,
      logoUrl,
      invoiceTerms: editFormData.invoiceTerms.trim(),
      invoiceWarranty: editFormData.invoiceWarranty.trim(),
      status: editFormData.status,
    });

    if (result.success) {
      setEditDialogOpen(false);
      await refetchTokoList();
      router.refresh();
    } else {
      setEditError(result.error || "Failed to update toko");
    }

    setIsLoadingEdit(false);
  }, [selectedToko, editFormData, editLogoFile, refetchTokoList, router]);

  const handleCreate = useCallback(async () => {
    if (!createFormData.name.trim()) {
      setCreateError("Toko name is required");
      return;
    }

    if (createFormData.name.trim().length < 2) {
      setCreateError("Toko name must be at least 2 characters");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    let logoUrl: string | undefined = undefined;
    if (createLogoFile) {
      const formDataUpload = new FormData();
      formDataUpload.append("file", createLogoFile);
      formDataUpload.append("pathname", `logos/${Date.now()}-${createLogoFile.name}`);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (res.ok) {
          const result = await res.json();
          logoUrl = result.blob.url;
        }
      } catch (err) {
        console.error("Logo upload error:", err);
      }
    }

    const result = await createToko({
      name: createFormData.name.trim(),
      address: createFormData.address.trim() || undefined,
      phone: createFormData.phone.trim() || undefined,
      logoUrl,
    });

    if (result.success) {
      setCreateDialogOpen(false);
      await refetchTokoList();
      if (result.storeId) {
        router.push(`/${result.storeId}/admin`);
      }
      router.refresh();
    } else {
      setCreateError(result.error || "Failed to create toko");
    }

    setIsCreating(false);
  }, [createFormData, createLogoFile, refetchTokoList, router]);

  const handleDelete = useCallback((tokoId: string) => {
    const toko = tokoList.find((t) => t.id === tokoId);
    if (toko) {
      setSelectedToko({
        id: toko.id,
        name: toko.name,
        address: null,
        phone: null,
        logoUrl: toko.logoUrl,
        invoiceTerms: null,
        invoiceWarranty: null,
        status: toko.status,
      });
      setDeleteDialogOpen(true);
    }
  }, [tokoList]);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedToko) return;

    setIsDeleting(true);

    const result = await deleteToko(selectedToko.id);

    if (result.success) {
      setDeleteDialogOpen(false);
      await refetchTokoList();

      if (selectedToko.id === tokoid) {
        const remainingTokos = tokoList.filter((t) => t.id !== selectedToko.id);
        if (remainingTokos.length > 0) {
          router.push(`/${remainingTokos[0].id}/admin`);
        } else {
          router.push("/dashboard");
        }
      } else {
        router.refresh();
      }
    } else {
      console.error(result.error || "Failed to delete toko");
    }

    setIsDeleting(false);
  }, [selectedToko, tokoid, tokoList, refetchTokoList, router]);

  const handleSwitchToko = useCallback((newTokoId: string) => {
    router.push(`/${newTokoId}/admin`);
  }, [router]);

  const resetEditForm = useCallback(() => {
    setEditFormData({
      name: "",
      address: "",
      phone: "",
      logoUrl: "",
      invoiceTerms: "",
      invoiceWarranty: "",
      status: "active",
    });
    setEditLogoFile(null);
    setEditLogoPreview(null);
    setSelectedToko(null);
    setEditError(null);
  }, []);

  const resetCreateForm = useCallback(() => {
    setCreateFormData({
      name: "",
      address: "",
      phone: "",
    });
    setCreateLogoFile(null);
    setCreateLogoPreview(null);
    setCreateError(null);
  }, []);

  return (
<div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">Manage Toko</h1>
              <div className="h-6 w-1 bg-primary rounded-full" />
            </div>
            <p className="text-sm text-muted-foreground/70">{tokoList.length} toko registered</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30">
            <RiAddLine className="h-4 w-4 mr-1.5" />
            Add Toko
          </Button>
        </div>

        <McpSettingsCard />

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tokoList.map((toko) => {
            const isCurrent = toko.id === tokoid;
            const variant = isCurrent ? "primary" : "default";
            const bgStyles: Record<string, string> = {
              default: "bg-card",
              primary: "bg-gradient-to-br from-primary/5 via-card to-primary/[0.02]",
            };
            const accentColors: Record<string, string> = {
              default: "bg-border",
              primary: "bg-primary",
            };

            return (
              <div
                key={toko.id}
                onClick={() => toko.id !== tokoid && handleSwitchToko(toko.id)}
                className={`relative ${bgStyles[variant]} rounded-xl border border-border/50 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 hover:border-border/80 ${toko.id !== tokoid ? "cursor-pointer" : ""}`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${accentColors[variant]} transition-all duration-300 opacity-80 group-hover:w-1.5 group-hover:opacity-100`} />
                <div className={`absolute top-3 right-3 w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border border-border/50 transition-all duration-300 group-hover:scale-105 group-hover:rounded-2xl`}>
                  {toko.logoUrl ? (
                    <Image
                      src={toko.logoUrl}
                      alt={toko.name}
                      width={48}
                      height={48}
                      className="size-10 rounded-lg object-cover"
                    />
                  ) : (
                    <RiStore2Line className="size-5 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
                  )}
                </div>
                <div className={`absolute top-0 right-0 w-20 h-20 ${accentColors[variant]}/5 rounded-full blur-2xl transition-all duration-300 group-hover:w-28 group-hover:h-28 group-hover:opacity-80`} />
                <div className="pl-5 pr-4 pt-5 pb-4 relative z-10">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest transition-colors duration-300 group-hover:text-muted-foreground/90">Toko</p>
                  <div className="mt-2 text-xl font-black tracking-tight text-foreground truncate transition-transform duration-300 group-hover:scale-[1.02]">{toko.name}</div>
                  {toko.address && (
                    <p className="text-xs text-muted-foreground/70 mt-1 truncate">{toko.address}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={toko.status === "active" ? "default" : "secondary"} className="text-xs">
                      {toko.status}
                    </Badge>
                    {isCurrent && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <RiCheckLine className="size-3" />
                        <span className="font-medium">Current</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleEdit(toko.id); }}
                      className="transition-all duration-200 hover:bg-muted/80"
                    >
                      <RiEditLine className="size-3" />
                    </Button>
                    {tokoList.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(toko.id); }}
                        className="text-destructive hover:text-destructive transition-all duration-200 hover:bg-destructive/10 hover:border-destructive/30"
                      >
                        <RiDeleteBinLine className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-px ${accentColors[variant]}/20 transition-all duration-300 group-hover:h-0.5 group-hover:opacity-40`} />
              </div>
            );
          })}
        </section>

        <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) resetCreateForm(); setCreateDialogOpen(open); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Toko</DialogTitle>
            <DialogDescription>
              Create a new toko. You can add staff and technicians later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {createError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {createError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Toko Name</label>
              <div className="relative">
                <Input
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter toko name"
                  className="pl-10"
                  disabled={isCreating}
                />
                <RiStore2Line className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Logo (Optional)</label>
              <div className="flex items-center gap-4">
                {createLogoPreview ? (
                  <div className="relative">
                    {/* Local data URL preview from FileReader; next/image is unnecessary here. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={createLogoPreview}
                      alt="Logo preview"
                      className="size-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCreateLogoPreview(null);
                        setCreateLogoFile(null);
                      }}
                      className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      disabled={isCreating}
                    >
                      <RiCloseLine className="size-3" />
                    </button>
                  </div>
                ) : (
                  <div className="size-16 rounded-lg bg-muted flex items-center justify-center">
                    <RiImageLine className="size-6 text-muted-foreground" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleCreateLogoChange}
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address (Optional)</label>
              <div className="relative">
                <Input
                  value={createFormData.address}
                  onChange={(e) => setCreateFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Address"
                  className="pl-10"
                  disabled={isCreating}
                />
                <RiMapPinLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone (Optional)</label>
              <div className="relative">
                <Input
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone"
                  className="pl-10"
                  disabled={isCreating}
                />
                <RiPhoneLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { resetCreateForm(); setCreateDialogOpen(false); }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) resetEditForm(); setEditDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Toko</DialogTitle>
            <DialogDescription>
              Update toko information below.
            </DialogDescription>
          </DialogHeader>

          {isLoadingEdit && !selectedToko && (
            <div className="flex items-center justify-center py-8">
              <RiLoader4Line className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {selectedToko && (
            <div className="space-y-4">
              {editError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {editError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Toko Name</label>
                <div className="relative">
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Toko name"
                    className="pl-10"
                    disabled={isLoadingEdit}
                  />
                  <RiStore2Line className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Logo</label>
                <div className="flex items-center gap-4">
                  {editLogoPreview ? (
                    <div className="relative">
                      {/* Local data URL preview from FileReader; next/image is unnecessary here. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editLogoPreview}
                        alt="Logo preview"
                        className="size-16 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditLogoPreview(null);
                          setEditLogoFile(null);
                          setEditFormData((prev) => ({ ...prev, logoUrl: "" }));
                        }}
                        className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        disabled={isLoadingEdit}
                      >
                        <RiCloseLine className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="size-16 rounded-lg bg-muted flex items-center justify-center">
                      <RiImageLine className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleEditLogoChange}
                    disabled={isLoadingEdit}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <div className="relative">
                  <Input
                    value={editFormData.address}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Address (optional)"
                    className="pl-10"
                    disabled={isLoadingEdit}
                  />
                  <RiMapPinLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <div className="relative">
                  <Input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone (optional)"
                    className="pl-10"
                    disabled={isLoadingEdit}
                  />
                  <RiPhoneLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Syarat & Ketentuan Nota</label>
                  <Textarea
                    value={editFormData.invoiceTerms}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, invoiceTerms: e.target.value }))}
                    placeholder="Barang yang tidak diambil lebih dari 30 hari di luar tanggung jawab toko."
                    rows={5}
                    disabled={isLoadingEdit}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Garansi Service</label>
                  <Textarea
                    value={editFormData.invoiceWarranty}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, invoiceWarranty: e.target.value }))}
                    placeholder="Garansi berlaku sesuai jenis kerusakan dan tidak berlaku untuk kerusakan fisik/cairan."
                    rows={5}
                    disabled={isLoadingEdit}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex gap-2">
                  <Button
                    variant={editFormData.status === "active" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditFormData((prev) => ({ ...prev, status: "active" }))}
                    disabled={isLoadingEdit}
                  >
                    Active
                  </Button>
                  <Button
                    variant={editFormData.status === "inactive" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditFormData((prev) => ({ ...prev, status: "inactive" }))}
                    disabled={isLoadingEdit}
                  >
                    Inactive
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { resetEditForm(); setEditDialogOpen(false); }}
              disabled={isLoadingEdit}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isLoadingEdit}>
              {isLoadingEdit ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Toko"
        description={`Are you sure you want to delete "${selectedToko?.name}"? This will permanently remove all associated data including services, spareparts, and user assignments.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
