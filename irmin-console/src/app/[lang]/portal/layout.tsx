import type { Metadata } from 'next';

import PortalNavigation from '@/components/portal-navigation/portalNavigation';
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
        <PortalNavigation>
          <ProtectedRoute>{children}</ProtectedRoute>
        </PortalNavigation>
      </WorkspaceProvider>
    </PopupProvider>
  );
}
