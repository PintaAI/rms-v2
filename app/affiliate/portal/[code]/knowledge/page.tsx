import { getAffiliatePortalData } from "@/actions/affiliate";
import { AffiliateProductKnowledge } from "@/components/affiliate/affiliate-product-knowledge";
import { InvalidPortalLink } from "@/components/affiliate/invalid-portal-link";

interface AffiliateProductKnowledgePageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function AffiliateProductKnowledgePage({ params, searchParams }: AffiliateProductKnowledgePageProps) {
  const [{ code }, { token }] = await Promise.all([params, searchParams]);
  const result = await getAffiliatePortalData({ code, token: token || "" });

  if (!result.success || !result.data) return <InvalidPortalLink />;

  return (
    <AffiliateProductKnowledge
      affiliatorName={result.data.affiliator.name}
      affiliateCode={result.data.affiliator.code}
    />
  );
}
