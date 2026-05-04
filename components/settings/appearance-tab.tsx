"use client";

import * as React from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme-preference";

export function AppearanceSettingsTab() {
  const [dynamicTheme, setDynamicTheme] = React.useState<ThemeMode>(() => getThemeMode());

  const handleToggle = (checked: boolean) => {
    const newMode: ThemeMode = checked ? "dynamic" : "default";
    setDynamicTheme(newMode);
    setThemeMode(newMode);
    toast.success(`Tema ${checked ? "dinamis" : "default"} aktif`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">Tema Dinamis</p>
            <p className="text-xs text-muted-foreground">Ekstrak warna dari logo toko untuk tema aplikasi</p>
          </div>
          <Switch checked={dynamicTheme === "dynamic"} onCheckedChange={handleToggle} />
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <p className="text-sm font-medium">Tema Default</p>
        <p className="text-xs text-muted-foreground">Warna statis dari konfigurasi default aplikasi</p>
        <div className="mt-2 flex gap-2">
          <div className="size-8 rounded-md bg-primary" title="Primary" />
          <div className="size-8 rounded-md border bg-secondary" title="Secondary" />
          <div className="size-8 rounded-md border bg-accent" title="Accent" />
        </div>
      </div>
    </div>
  );
}
