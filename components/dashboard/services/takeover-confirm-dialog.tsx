"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiLoader4Line, RiRefreshLine } from "@remixicon/react";

interface TakeoverConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  technicianName: string;
  serviceLabel: string;
  isLoading?: boolean;
}

export function TakeoverConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  technicianName,
  serviceLabel,
  isLoading = false,
}: TakeoverConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiRefreshLine className="h-5 w-5" />
            Konfirmasi Takeover Task
          </DialogTitle>
          <DialogDescription>
            {serviceLabel} saat ini ditangani oleh {technicianName}. Lanjutkan untuk mengambil alih task ini.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          Technician assignment akan dipindahkan ke akunmu. Status task tetap seperti sekarang.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Takeover"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
