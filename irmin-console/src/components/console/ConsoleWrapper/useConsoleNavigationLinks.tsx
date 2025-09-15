'use client';

import { useCallback, useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { GoWorkflow } from 'react-icons/go';
import { MdCode } from 'react-icons/md';
import {
  TbBook,
  TbChevronLeft,
  TbDatabase,
  TbFile,
  TbHelp,
  TbLayoutDashboard,
  TbRun,
  TbSql,
} from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import type { ConsoleNavigationLinkType } from '@/types/internal/ConsoleNavigation';

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
  useful: ConsoleNavigationLinkType[];
  loadingPermissions: boolean;
} => {
  const { locale, dict } = useLocale();
  const { isResourceAllowed, loading: loadingPermissions } =
    useResourceAllowed();
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

  const workspaceLinks: ConsoleNavigationLinkType[] = useMemo(
    () =>
      [
        {
          title: dict.workspaceSwitcher.workspace,
          href: `${workspaceUrl}/home`,
          icon: <TbLayoutDashboard />,
          hide: !isResourceAllowed('workspace', 'read'),
        },
        {
          title: dict.repository.repositories,
          href: `${workspaceUrl}/repositories`,
          icon: <TbDatabase />,
          hide: !isResourceAllowed('repository', 'read'),
        },
        {
          title: dict.connections.connections,
          href: `${workspaceUrl}/connections`,
          icon: <GoWorkflow />,
          hide: !isResourceAllowed('connection', 'read'),
        },
        {
          title: dict.workflow.workflows,
          href: `${workspaceUrl}/workflows`,
          icon: <TbRun />,
          hide: !isResourceAllowed('workflow', 'read'),
        },
        {
          title: dict.consoleNavigation.editor,
          href: `${workspaceUrl}/editor`,
          icon: <TbFile />,
          hide: !isResourceAllowed('editor_script', 'read'),
        },
        {
          title: dict.consoleNavigation.queries,
          href: `${workspaceUrl}/queries`,
          icon: <TbSql />,
          hide: !isResourceAllowed('query', 'read'),
        },
      ].map((link) => ({
        ...link,
        active: isActiveLink(link.href),
      })),
    [workspaceUrl, dict, isActiveLink, isResourceAllowed]
  );

  const noWorkspaceLinks: ConsoleNavigationLinkType[] = useMemo(
    () =>
      [
        {
          title: dict.consoleNavigation.workspaces,
          href: `/${locale}/workspace`,
          icon: <TbLayoutDashboard />,
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

  const usefulLinks: ConsoleNavigationLinkType[] = useMemo(
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
    ],
    [locale, dict]
  );

  return {
    hasWorkspace: workspaceLinks.filter((link) => !link.hide),
    noWorkspace: noWorkspaceLinks.filter((link) => !link.hide),
    useful: usefulLinks.filter((link) => !link.hide),
    loadingPermissions,
  };
};

export default useConsoleNavigationLinks;
