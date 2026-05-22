import { redirect } from "next/navigation";
import { getRequestUser } from "@/lib/auth/request-user";
import { getRoleRedirectPath } from "@/lib/redirect-by-role";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { tokoid } = await params;
  const user = await getRequestUser();

  if (!user) {
    redirect("/auth");
  }

  if (!user.storeIds.includes(tokoid)) {
    redirect("/dashboard");
  }

  if (user.role !== "admin") {
    redirect(getRoleRedirectPath(tokoid, user.role));
  }

  return <>{children}</>;
}
