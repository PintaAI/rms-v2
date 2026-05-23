import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InvalidPortalLink() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Link tracking tidak valid</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Link tracking tidak valid atau sudah diperbarui. Hubungi tim RMS untuk mendapatkan link terbaru.
        </CardContent>
      </Card>
    </main>
  );
}
