import { getAllDocFiles } from "@/lib/markdown";
import { UserManualContent } from "@/components/user-manual/user-manual-content";

export default async function UserManualPage() {
  const files = await getAllDocFiles();

  return <UserManualContent files={files.map(f => ({ slug: f.slug, title: f.title, icon: f.icon }))} />;
}