import type { Metadata } from 'next';

import { defaultLocale, dictionaries, Locale } from '@/dictionaries';

import ProtectedRouteWrapper from '@/components/authentication/ProtectedRouteWrapper';
import ConsoleWrapper from '@/components/console/ConsoleWrapper';

import { PopupProvider } from '@/context/PopupContext';
import { WorkspaceProvider } from '@/context/workspace';

/**
 * Default layout level metadata for SEO on the console
 */
export const metadata: Metadata = {
  title: 'Console | IRMIN Console',
};

/**
 * Console layout
 *
 * @remarks
 * This layout is used for all pages within the Irmin console.
 *
 * It includes:
 * - Popup provider, for showing popups
 * - Workspace provider, for managing the workspace
 * - Console navigation, to wrap the page content with the console navigation
 * - Protected route, to ensure the user is authenticated when accessing the console
 *
 * Console pages everything thas is within the `src/[lang]/console` directory
 *
 * @param props - Layout properties
 * @param props.children - Page content
 * @param props.params - Page parameters
 */
export default function ConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: Locale };
}) {
  const lang = dictionaries[params.lang] ? params.lang : defaultLocale;
  return (
    <PopupProvider>
      <WorkspaceProvider locale={lang}>
        <ConsoleWrapper>
          <ProtectedRouteWrapper>{children}</ProtectedRouteWrapper>
        </ConsoleWrapper>
      </WorkspaceProvider>
    </PopupProvider>
  );
}
