"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createServicePricelist,
  updateServicePricelist,
  type ServicePricelist,
} from "@/actions/inventory";
import { RiLoader4Line, RiPriceTag3Line, RiEditLine } from "@remixicon/react";

interface ServicePricelistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricelist?: ServicePricelist | null;
  tokoId: string;
  onSuccess: (newPricelist?: ServicePricelist) => void;
}

function ServicePricelistFormContent({
  pricelist,
  tokoId,
  onOpenChange,
  onSuccess,
}: Omit<ServicePricelistFormDialogProps, "open">) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(pricelist?.title ?? "");
  const [defaultPrice, setDefaultPrice] = useState(pricelist ? pricelist.defaultPrice.toString() : "");
  const pricelistRef = useRef(pricelist);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = parseInt(defaultPrice, 10);
    if (isNaN(price) || price < 0) {
      setError("Harga harus berupa angka yang valid");
      return;
    }

    if (!title.trim()) {
      setError("Judul wajib diisi");
      return;
    }

    setIsLoading(true);

    const result = pricelistRef.current
      ? await updateServicePricelist({
          id: pricelistRef.current.id,
          title,
          defaultPrice: price,
        })
      : await createServicePricelist({
          title,
          defaultPrice: price,
          tokoId,
        });

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Gagal menyimpan daftar harga jasa");
      return;
    }

    if (result.data) {
      onSuccess(result.data);
      onOpenChange(false);
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
            <RiPriceTag3Line className="h-4 w-4" />
          </span>
          {pricelist ? "Edit Jasa" : "Tambah Jasa"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          {error && <div className="rounded p-3 text-sm text-destructive bg-destructive/10">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-1.5">
              <RiEditLine className="h-3.5 w-3.5 text-muted-foreground" />
              Judul
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Ganti LCD"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center gap-1.5">
              <RiPriceTag3Line className="h-3.5 w-3.5 text-muted-foreground" />
              Harga Default
            </Label>
            <Input
              id="price"
              type="number"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              placeholder="0"
              min="0"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <RiLoader4Line className="size-4 animate-spin" />
                Menyimpan...
              </>
            ) : pricelist ? (
              "Perbarui"
            ) : (
              "Buat"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function ServicePricelistFormDialog(props: ServicePricelistFormDialogProps) {
  const { open } = props;

  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      {open ? <ServicePricelistFormContent key={props.pricelist?.id ?? "new-pricelist"} {...props} /> : null}
    </Dialog>
  );
}
