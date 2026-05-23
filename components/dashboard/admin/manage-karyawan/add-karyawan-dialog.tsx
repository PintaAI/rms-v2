"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import {
  RiLoader4Line,
  RiLockPasswordLine,
  RiMailLine,
  RiUserLine,
} from "@remixicon/react";
import { sanitizeForEmail } from "./permission-utils";
import type { FormData, RoleOption } from "./types";

interface AddKaryawanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  tokoName: string;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function AddKaryawanDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  tokoName,
  error,
  isSubmitting,
  onSubmit,
}: AddKaryawanDialogProps) {
  const generatedEmailPreview =
    formData.name.trim() && tokoName
      ? `${sanitizeForEmail(formData.name)}-${formData.role}@${sanitizeForEmail(tokoName)}.com`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
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
                  onChange={(e) => onFormDataChange({ ...formData, password: e.target.value })}
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
                  onClick={() => onFormDataChange({ ...formData, role: "staff" })}
                  className="flex-1"
                >
                  Staff
                </Button>
                <Button
                  variant={formData.role === "technician" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFormDataChange({ ...formData, role: "technician" })}
                  className="flex-1"
                >
                  Technician
                </Button>
              </div>
            </FieldContent>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
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
  );
}
