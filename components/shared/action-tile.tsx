"use client";

import type { ComponentProps, ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionTileProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  variant?: ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
  className?: string;
}

export function ActionTile({
  icon: Icon,
  label,
  onClick,
  variant,
  disabled,
  className,
}: ActionTileProps) {
  return (
    <Button
      variant={variant}
      disabled={disabled}
      onClick={onClick}
      className={cn("flex-col h-auto py-3 gap-1.5", className)}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </Button>
  );
}
