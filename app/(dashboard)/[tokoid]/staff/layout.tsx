interface StaffLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function StaffLayout({ children }: StaffLayoutProps) {
  return <>{children}</>;
}