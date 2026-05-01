import { Suspense } from "react";
import { MobileScannerClient } from "@/components/mobile-scanner/mobile-scanner-client";

interface ScannerPageProps {
  params: Promise<{ code: string }>;
}

export default async function ScannerPage({ params }: ScannerPageProps) {
  const { code } = await params;

  return (
    <Suspense fallback={<div className="min-h-dvh bg-background p-6 text-sm text-muted-foreground">Memuat scanner...</div>}>
      <MobileScannerClient code={code} />
    </Suspense>
  );
}
