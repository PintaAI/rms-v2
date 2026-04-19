"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/auth/auth-provider";
import { getTokoById, updateToko, deleteToko, createToko } from "@/actions/toko";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      if (result.tokoId) {
        router.push(`/${result.tokoId}/admin`);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manage Toko</h1>
          <p className="text-sm text-muted-foreground">
            {tokoList.length} toko registered
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <RiAddLine className="size-4" />
          Add Toko
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tokoList.map((toko) => (
          <Card key={toko.id} className={toko.id === tokoid ? "ring-2 ring-primary" : ""}>
            <CardHeader>
              <div className="flex items-start gap-3">
                {toko.logoUrl ? (
                  <Image
                    src={toko.logoUrl}
                    alt={toko.name}
                    width={48}
                    height={48}
                    className="size-12 rounded-lg object-cover border bg-muted"
                  />
                ) : (
                  <div className="size-12 rounded-lg bg-muted flex items-center justify-center border">
                    <RiStore2Line className="size-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate">{toko.name}</CardTitle>
                  <CardDescription>
                    <Badge variant={toko.status === "active" ? "default" : "secondary"} className="text-xs">
                      {toko.status}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {toko.id === tokoid && (
                <div className="flex items-center gap-1 text-xs text-primary mb-2">
                  <RiCheckLine className="size-3" />
                  <span>Current</span>
                </div>
              )}
            </CardContent>
            <CardAction className="p-4 pt-0 flex gap-2">
              {toko.id !== tokoid && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSwitchToko(toko.id)}
                >
                  Switch
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(toko.id)}
              >
                <RiEditLine className="size-3" />
                Edit
              </Button>
              {tokoList.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(toko.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <RiDeleteBinLine className="size-3" />
                </Button>
              )}
            </CardAction>
          </Card>
        ))}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) resetCreateForm(); setCreateDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
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