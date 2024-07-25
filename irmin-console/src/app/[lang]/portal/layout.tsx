import type { Metadata } from 'next';

import PortalNavigation from '@/components/portal-navigation/portalNavigation';
import ProtectedRoute from '@/components/ProtectedRoute';

import { PopupProvider } from '@/context/PopupContext';
import { WorkspaceProvider } from '@/context/workspace';

/**
 * Default layout level metadata for SEO on the portal
 */
export const metadata: Metadata = {
  title: 'Portal | IRMIN Portal',
  openGraph: {
    type: 'website',
    title: 'Portal | IRMIN Portal',
    description: 'Sync, analyse & manage your data with AI in minutes.',
  },
};

/**
 * Portal layout
 *
 * @remarks
 * This layout is used for all pages within the Irmin portal.
 *
 * It includes:
 * - Popup provider, for showing popups
 * - Workspace provider, for managing the workspace
 * - Portal navigation, to wrap the page content with the portal navigation
 * - Protected route, to ensure the user is authenticated when accessing the portal
 *
 * Portal pages everything thas is within the `src/[lang]/portal` directory
 *
 * @param props - Children to render
 * @returns Website layout
 */
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
