'use client';

import { useCallback, useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { GoWorkflow } from 'react-icons/go';
import { MdCode, MdOutlinePrivacyTip } from 'react-icons/md';
import {
  TbBook,
  TbChevronLeft,
  TbDashboard,
  TbDatabase,
  TbFile,
  TbHelp,
  TbLogout,
  TbLogs,
  TbRun,
  TbSchema,
  TbSettings,
  TbSql,
  TbUser,
} from 'react-icons/tb';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { ConsoleNavigationLinkType } from '@/types/internal/ConsoleNavigation';

/**
 * Hook to get console navigation links
 *
 * @remarks
 *
 * This hook is used to get the console navigation links.
 * The links are defined in the code and are used in the console navigation component.
 * Uses {@link useIAM} to interact with the user's identity and APIs.
 *
 * @returns Console navigation links sorted by sections
 */
const useConsoleNavigationLinks = (): {
  hasWorkspace: ConsoleNavigationLinkType[];
  noWorkspace: ConsoleNavigationLinkType[];
  settings: ConsoleNavigationLinkType[];
  useful: ConsoleNavigationLinkType[];
} => {
  const { locale, dict } = useLocale();
  const { signOut } = useIAM();
  const pathname = usePathname();

  // Check if the link is active
  const isActiveLink = useCallback(
    (href: string) => {
      if (href === '/console' || !href.includes('/console'))
        return pathname === href;
      return pathname.startsWith(href);
    },
    [pathname]
  );

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const workspaceLinks = useMemo(
    () =>
      [
        {
          title: dict.consoleNavigation.links.home,
          href: `${workspaceUrl}/home`,
          icon: <TbDashboard />,
        },
        {
          title: dict.consoleNavigation.links.repositories,
          href: `${workspaceUrl}/repositories`,
          icon: <TbDatabase />,
        },
        {
          title: dict.consoleNavigation.links.connections,
          href: `${workspaceUrl}/connections`,
          icon: <GoWorkflow />,
        },
        {
          title: dict.consoleNavigation.links.workflows,
          href: `${workspaceUrl}/workflows`,
          icon: <TbRun />,
        },
        {
          title: dict.consoleNavigation.links.editor,
          href: `${workspaceUrl}/editor`,
          icon: <TbFile />,
        },
        {
          title: dict.consoleNavigation.links.queries,
          href: `${workspaceUrl}/queries`,
          icon: <TbSql />,
        },
        {
          title: dict.consoleNavigation.links.logs,
          href: `${workspaceUrl}/logs`,
          icon: <TbLogs />,
        },
        {
          title: dict.consoleNavigation.links.documentation,
          href: `${workspaceUrl}/documentation`,
          icon: <TbSchema />,
        },
      ].map((link) => ({
        ...link,
        active: isActiveLink(link.href),
      })),
    [workspaceUrl, dict, isActiveLink]
  );

  const noWorkspaceLinks = [
    {
      title: dict.consoleNavigation.links.workspaces,
      href: `/${locale}/console/manage-workspaces`,
      icon: <TbDashboard />,
    },
    {
      title: dict.consoleNavigation.links.goToWebsite,
      href: '/',
      icon: <TbChevronLeft />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

  const settingsLinks = [
    {
      title: dict.consoleNavigation.links.workspaceSettings,
      href: `${workspaceUrl}/settings`,
      icon: <TbSettings />,
      active: isActiveLink(`${workspaceUrl}/settings`),
    },
    {
      title: dict.consoleNavigation.links.myProfile,
      href: `/${locale}/console/profile`,
      icon: <TbUser />,
      active: isActiveLink(`/${locale}/console/profile`),
    },
    {
      title: dict.consoleNavigation.links.signOut,
      action: signOut,
      icon: <TbLogout />,
      active: false,
    },
  ];

  const usefulLinks = [
    {
      title: dict.consoleNavigation.links.guides,
      href: `/${locale}/legal`,
      icon: <TbBook />,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.consoleNavigation.links.developerDocs,
      href: `/${locale}/docs`,
      icon: <MdCode />,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.consoleNavigation.links.contactSupport,
      href: `/${locale}/contact`,
      icon: <TbHelp />,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.consoleNavigation.links.termsAndPrivacy,
      href: `/${locale}/legal`,
      icon: <MdOutlinePrivacyTip />,
      props: {
        target: '_blank',
      },
      active: false,
    },
  ];

  return {
    hasWorkspace: workspaceLinks,
    noWorkspace: noWorkspaceLinks,
    settings: settingsLinks,
    useful: usefulLinks,
  };
};

export default useConsoleNavigationLinks;
