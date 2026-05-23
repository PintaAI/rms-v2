import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AffiliateStatCardProps {
  title: string;
  value: string | number;
  size?: "sm" | "md";
}

export function AffiliateStatCard({ title, value, size = "md" }: AffiliateStatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`font-medium text-muted-foreground ${size === "sm" ? "text-xs" : "text-sm"}`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`font-bold ${size === "sm" ? "text-xl" : "text-2xl"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
