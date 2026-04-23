import { getAuthUser } from "@/lib/rbac";
import { getRoleRedirectPath } from "@/lib/redirect-by-role";
import { redirect } from "next/navigation";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { tokoid } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect("/auth");
  }

  if (!user.tokoIds.includes(tokoid)) {
    redirect("/dashboard");
  }

  if (user.role !== "admin") {
    redirect(getRoleRedirectPath(tokoid, user.role));
  }

  return <>{children}</>;
}
