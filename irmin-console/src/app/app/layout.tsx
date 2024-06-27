import type { Metadata } from 'next';
import ProtectedRoute from '@/components/ProtectedRoute';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { PopupProvider } from '@/context/PopupContext';
import DashboardNavigation from '@/components/dashboardNavigation';

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
    <ProtectedRoute>
      <WorkspaceProvider>
        <PopupProvider>
          <DashboardNavigation>{children}</DashboardNavigation>
        </PopupProvider>
      </WorkspaceProvider>
    </ProtectedRoute>
  );
}
