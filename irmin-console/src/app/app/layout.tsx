import type { Metadata } from 'next';

import DashboardNavigation from '@/components/dashboard-navigation/dashboardNavigation';
import ProtectedRoute from '@/components/ProtectedRoute';

import { PopupProvider } from '@/context/PopupContext';
import { WorkspaceProvider } from '@/context/workspace';

export const metadata: Metadata = {
  title: 'Irmin App',
  description: 'A better home for your data',
};

export default function AppLayout({
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
