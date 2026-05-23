import { getAffiliatePortalData } from "@/actions/affiliate";
import { AffiliatePortal } from "@/components/affiliate/affiliate-portal";
import { InvalidPortalLink } from "@/components/affiliate/invalid-portal-link";

interface AffiliatePortalPageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function AffiliatePortalPage({ params, searchParams }: AffiliatePortalPageProps) {
  const [{ code }, { token }] = await Promise.all([params, searchParams]);
  const result = await getAffiliatePortalData({ code, token: token || "" });

  if (!result.success || !result.data) return <InvalidPortalLink />;

  return <AffiliatePortal data={result.data} token={token || ""} />;
}
