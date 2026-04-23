import { getAuthUser } from "@/lib/rbac";
import { getRoleRedirectPath } from "@/lib/redirect-by-role";
import { redirect } from "next/navigation";

interface StaffLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function StaffLayout({ children, params }: StaffLayoutProps) {
  const { tokoid } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect("/auth");
  }

  if (!user.tokoIds.includes(tokoid)) {
    redirect("/dashboard");
  }

  if (user.role !== "staff") {
    redirect(getRoleRedirectPath(tokoid, user.role));
  }

  return <>{children}</>;
}
