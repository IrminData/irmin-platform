import type { Metadata } from 'next';

import DashboardNavigation from '@/components/dashboard-navigation/dashboardNavigation';
import ProtectedRoute from '@/components/ProtectedRoute';

import { PopupProvider } from '@/context/PopupContext';
import { WorkspaceProvider } from '@/context/workspace';

export const metadata: Metadata = {
  title: 'Portal | IRMIN',
  openGraph: {
    type: 'website',
    title: 'Portal | IRMIN',
    description: 'Sync, analyse & manage your data with AI in minutes.',
  },
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PopupProvider>
      <WorkspaceProvider>
        <DashboardNavigation>
          <ProtectedRoute>{children}</ProtectedRoute>
        </DashboardNavigation>
      </WorkspaceProvider>
    </PopupProvider>
  );
}
