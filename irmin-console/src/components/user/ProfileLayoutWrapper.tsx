'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { TbKey, TbSettings } from 'react-icons/tb';

import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

/**
 * Component to wrap the User's profile Settings pages in.
 * Provides tabs and title.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 */
export default function ProfileLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { dict } = useLocale();

  // The base URL for the workspace, eg. /en/console
  const consoleUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 0,
  });

  const tabs = useMemo(
    () => [
      {
        name: dict.workspace.general,
        link: `${consoleUrl}/profile`,
        active: pathname === `${consoleUrl}/profile`,
        icon: <TbSettings size={14} />,
      },
      {
        name: dict.tokens.apiTokens,
        link: `${consoleUrl}/profile/tokens`,
        active: pathname === `${consoleUrl}/profile/tokens`,
        icon: <TbKey size={14} />,
      },
    ],
    [pathname, dict, consoleUrl]
  );

  return (
    <>
      <div className='container relative mx-auto max-w-6xl'>
        <div className='mx-auto my-8 flex w-full flex-col gap-2 px-2 md:px-4'>
          <h1 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
            {dict.consoleNavigation.myProfile}
          </h1>
        </div>
        <TabsWithBackButton
          backHref={`${consoleUrl}`}
          backTooltip={dict.consoleNavigation.irminConsole}
          tabs={tabs}
        />
      </div>
      <div>{children}</div>
    </>
  );
}
