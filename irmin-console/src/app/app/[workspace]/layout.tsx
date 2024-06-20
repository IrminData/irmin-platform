import DashboardNavigation from '@/components/dashboardNavigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Irmin',
  description: 'A better home for your data',
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <DashboardNavigation>{children}</DashboardNavigation>
    </>
  );
}
