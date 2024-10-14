import type { Metadata } from 'next';

import { defaultLocale, dictionaries, Locale } from '@/dictionaries';

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
 * This layout is used for all pages within the Irmin console.
 *
 * - Popup provider, for showing popups
 * - Workspace provider, for managing the workspace
 * - Console navigation, to wrap the page content with the console navigation
 *
 * Console pages are everything that is within the `/src/app/[lang]/console` directory
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
        <ConsoleWrapper>{children}</ConsoleWrapper>
      </WorkspaceProvider>
    </PopupProvider>
  );
}
