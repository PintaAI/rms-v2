import { AffiliateProductKnowledge } from "@/components/affiliate/affiliate-product-knowledge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Knowledge | Program Afiliasi RMS",
  description:
    "Pelajari produk RMS — software operasional toko servis HP — sebelum menjadi affiliator. Kenali fitur, paket harga, dan struktur komisi.",
};

export default function PublicProductKnowledgePage() {
  return <AffiliateProductKnowledge />;
}
