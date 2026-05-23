"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiFileCopyLine, RiInformationLine } from "@remixicon/react";

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: { name: string; email: string; password: string } | null;
}

export function CredentialsDialog({
  open,
  onOpenChange,
  credentials,
}: CredentialsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Akun Berhasil Dibuat</DialogTitle>
          <DialogDescription>
            Simpan informasi berikut dan kirimkan ke <strong>{credentials?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {credentials && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Email</p>
                  <p className="text-sm font-mono">{credentials.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigator.clipboard.writeText(credentials.email)}
                  title="Salin email"
                >
                  <RiFileCopyLine className="size-4" />
                </Button>
              </div>
              <div className="h-px bg-border/50" />
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Password</p>
                  <p className="text-sm font-mono">{credentials.password}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigator.clipboard.writeText(credentials.password)}
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
          <Button onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
