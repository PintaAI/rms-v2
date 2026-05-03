import { getRequestUser } from "@/lib/auth/request-user";
import { redirect } from "next/navigation";

interface SuperuserLayoutProps {
  children: React.ReactNode;
}

export default async function SuperuserLayout({ children }: SuperuserLayoutProps) {
  const user = await getRequestUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.role !== "superuser") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}