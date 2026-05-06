import { getAffiliatePortalData } from "@/actions/affiliate";
import { AffiliateProductKnowledge } from "@/components/affiliate/affiliate-product-knowledge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AffiliateProductKnowledgePageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function AffiliateProductKnowledgePage({ params, searchParams }: AffiliateProductKnowledgePageProps) {
  const [{ code }, { token }] = await Promise.all([params, searchParams]);
  const result = await getAffiliatePortalData({ code, token: token || "" });

  if (!result.success || !result.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardHeader><CardTitle>Link tracking tidak valid</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Link tracking tidak valid atau sudah diperbarui. Hubungi tim RMS untuk mendapatkan link terbaru.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <AffiliateProductKnowledge
      affiliatorName={result.data.affiliator.name}
      affiliateCode={result.data.affiliator.code}
    />
  );
}
