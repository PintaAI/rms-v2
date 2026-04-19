import { ManageToko } from "@/components/dashboard/admin/manage-toko";

export default async function AdminTokoPage({
  params,
}: {
  params: Promise<{ tokoid: string }>;
}) {
  const { tokoid } = await params;

  return <ManageToko currentTokoId={tokoid} />;
}