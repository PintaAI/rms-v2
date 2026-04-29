import { getAuthUser, isSuperuser } from "@/lib/rbac";
import { redirect } from "next/navigation";

interface SuperuserLayoutProps {
  children: React.ReactNode;
}

export default async function SuperuserLayout({ children }: SuperuserLayoutProps) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/auth");
  }

  if (!isSuperuser(user)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}