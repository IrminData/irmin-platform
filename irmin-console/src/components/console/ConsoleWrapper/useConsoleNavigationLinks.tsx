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

const websiteURL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://irmin.dev';

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
    (href: string) => pathname.startsWith(href),
    [pathname]
  );

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const workspaceLinks = useMemo(
    () =>
      [
        {
          title: dict.repository.repositories,
          href: `${workspaceUrl}/repositories`,
          icon: <TbDatabase />,
        },
        {
          title: dict.connections.connections,
          href: `${workspaceUrl}/connections`,
          icon: <GoWorkflow />,
        },
        {
          title: dict.workflow.workflows,
          href: `${workspaceUrl}/workflows`,
          icon: <TbRun />,
        },
        {
          title: dict.consoleNavigation.editor,
          href: `${workspaceUrl}/editor`,
          icon: <TbFile />,
        },
        {
          title: dict.consoleNavigation.queries,
          href: `${workspaceUrl}/queries`,
          icon: <TbSql />,
        },
        {
          title: dict.consoleNavigation.logs,
          href: `${workspaceUrl}/logs`,
          icon: <TbLogs />,
        },
        {
          title: dict.documentation.documentation,
          href: `${workspaceUrl}/documentation`,
          icon: <TbSchema />,
        },
      ].map((link) => ({
        ...link,
        active: isActiveLink(link.href),
      })),
    [workspaceUrl, dict, isActiveLink]
  );

  const noWorkspaceLinks = useMemo(
    () =>
      [
        {
          title: dict.consoleNavigation.workspaces,
          href: `/${locale}/workspace`,
          icon: <TbDashboard />,
        },
        {
          title: dict.consoleNavigation.goToWebsite,
          href: `${websiteURL}/${locale}`,
          icon: <TbChevronLeft />,
        },
      ].map((link) => ({
        ...link,
        active: isActiveLink(link.href),
      })),
    [locale, isActiveLink, dict]
  );

  const settingsLinks = useMemo(
    () => [
      {
        title: dict.consoleNavigation.workspaceSettings,
        href: `${workspaceUrl}/settings`,
        icon: <TbSettings />,
        active: isActiveLink(`${workspaceUrl}/settings`),
        workspaceOnly: true,
      },
      {
        title: dict.consoleNavigation.myProfile,
        href: `/${locale}/profile`,
        icon: <TbUser />,
        active: isActiveLink(`/${locale}/profile`),
      },
      {
        title: dict.consoleNavigation.signOut,
        action: signOut,
        icon: <TbLogout />,
        active: false,
      },
    ],
    [locale, isActiveLink, signOut, workspaceUrl, dict]
  );

  const usefulLinks = useMemo(
    () => [
      {
        title: dict.consoleNavigation.guides,
        href: `${websiteURL}/${locale}/legal`,
        icon: <TbBook />,
        props: {
          target: '_blank',
        },
        active: false,
      },
      {
        title: dict.consoleNavigation.developerDocs,
        href: `${websiteURL}/${locale}/docs`,
        icon: <MdCode />,
        props: {
          target: '_blank',
        },
        active: false,
      },
      {
        title: dict.consoleNavigation.contactSupport,
        href: `${websiteURL}/${locale}/contact`,
        icon: <TbHelp />,
        props: {
          target: '_blank',
        },
        active: false,
      },
      {
        title: dict.consoleNavigation.termsAndPrivacy,
        href: `${websiteURL}/${locale}/legal`,
        icon: <MdOutlinePrivacyTip />,
        props: {
          target: '_blank',
        },
        active: false,
      },
    ],
    [locale, dict]
  );

  return {
    hasWorkspace: workspaceLinks,
    noWorkspace: noWorkspaceLinks,
    settings: settingsLinks,
    useful: usefulLinks,
  };
};

export default useConsoleNavigationLinks;
