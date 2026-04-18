"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createServicePricelist,
  updateServicePricelist,
  type ServicePricelist,
} from "@/actions/inventory";
import { RiLoader4Line } from "@remixicon/react";

interface ServicePricelistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricelist?: ServicePricelist | null;
  tokoId: string;
  onSuccess: (newPricelist?: ServicePricelist) => void;
}

export function ServicePricelistFormDialog({
  open,
  onOpenChange,
  pricelist,
  tokoId,
  onSuccess,
}: ServicePricelistFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");

  const pricelistRef = useRef(pricelist);

  useEffect(() => {
    pricelistRef.current = pricelist;
  }, [pricelist]);

  useEffect(() => {
    if (open) {
      if (pricelist) {
        setTitle(pricelist.title);
        setDefaultPrice(pricelist.defaultPrice.toString());
      } else {
        setTitle("");
        setDefaultPrice("");
      }
      setError(null);
    }
  }, [pricelist, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = parseInt(defaultPrice, 10);
    if (isNaN(price) || price < 0) {
      setError("Price must be a valid number");
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsLoading(true);

    let result;
    if (pricelistRef.current) {
      result = await updateServicePricelist({
        id: pricelistRef.current.id,
        title,
        defaultPrice: price,
      });
    } else {
      result = await createServicePricelist({
        title,
        defaultPrice: price,
        tokoId,
      });
    }

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Failed to save service pricelist");
    } else if (result.data) {
      onSuccess(result.data);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {pricelist ? "Edit Jasa" : "Add Jasa"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Ganti LCD"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Default Price</Label>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                pricelist ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}