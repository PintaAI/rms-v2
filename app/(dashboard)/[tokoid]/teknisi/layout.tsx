interface TeknisiLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tokoid: string }>;
}

export default async function TeknisiLayout({ children }: TeknisiLayoutProps) {
  return <>{children}</>;
}