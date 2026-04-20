import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  received: { label: "Masuk", variant: "secondary" },
  repairing: { label: "Proses", variant: "default" },
  done: { label: "Selesai", variant: "outline" },
  failed: { label: "Gagal", variant: "destructive" },
  picked_up: { label: "Diambil", variant: "default" },
};

export function StatusBadgeDemo() {
  return (
    <div className="flex flex-wrap gap-3 p-4 rounded-lg border bg-muted/30">
      {Object.entries(statusConfig).map(([status, config]) => (
        <Badge key={status} variant={config.variant}>
          {config.label}
        </Badge>
      ))}
    </div>
  );
}