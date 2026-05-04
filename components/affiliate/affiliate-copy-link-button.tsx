"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RiFileCopyLine } from "@remixicon/react";

export function AffiliateCopyLinkButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast.success("Link copied");
      }}
    >
      <RiFileCopyLine data-icon="inline-start" />
      {label}
    </Button>
  );
}
