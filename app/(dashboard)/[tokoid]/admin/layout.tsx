interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  return <>{children}</>;
}