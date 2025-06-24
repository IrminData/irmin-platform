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
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';
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
  loadingPermissions: boolean;
} => {
  const { locale, dict } = useLocale();
  const { signOut } = useIAM();
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
          title: dict.repository.repositories,
          href: `${workspaceUrl}/repositories`,
          icon: <TbDatabase />,
          hide: !isResourceAllowed(
            PolicyResource.Repository,
            PolicyAction.Read
          ),
        },
        {
          title: dict.connections.connections,
          href: `${workspaceUrl}/connections`,
          icon: <GoWorkflow />,
          hide: !isResourceAllowed(
            PolicyResource.Connection,
            PolicyAction.Read
          ),
        },
        {
          title: dict.workflow.workflows,
          href: `${workspaceUrl}/workflows`,
          icon: <TbRun />,
          hide: !isResourceAllowed(PolicyResource.Workflow, PolicyAction.Read),
        },
        {
          title: dict.consoleNavigation.editor,
          href: `${workspaceUrl}/editor`,
          icon: <TbFile />,
          hide: !isResourceAllowed(
            PolicyResource.EditorScript,
            PolicyAction.Read
          ),
        },
        {
          title: dict.consoleNavigation.queries,
          href: `${workspaceUrl}/queries`,
          icon: <TbSql />,
          hide: !isResourceAllowed(PolicyResource.Query, PolicyAction.Read),
        },
        {
          title: dict.common.logs,
          href: `${workspaceUrl}/logs`,
          icon: <TbLogs />,
          hide: !isResourceAllowed(PolicyResource.AuditLog, PolicyAction.Read),
        },
        {
          title: dict.documentation.documentation,
          href: `${workspaceUrl}/documentation`,
          icon: <TbSchema />,
          hide: !isResourceAllowed(
            PolicyResource.Documentation,
            PolicyAction.Read
          ),
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

  const settingsLinks: ConsoleNavigationLinkType[] = useMemo(
    () => [
      {
        title: dict.consoleNavigation.workspaceSettings,
        href: `${workspaceUrl}/settings`,
        icon: <TbSettings />,
        active: isActiveLink(`${workspaceUrl}/settings`),
        workspaceOnly: true,
        hide: !isResourceAllowed(PolicyResource.Workspace, PolicyAction.Read),
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
    [locale, isActiveLink, signOut, workspaceUrl, dict, isResourceAllowed]
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
    hasWorkspace: workspaceLinks.filter((link) => !link.hide),
    noWorkspace: noWorkspaceLinks.filter((link) => !link.hide),
    settings: settingsLinks.filter((link) => !link.hide),
    useful: usefulLinks.filter((link) => !link.hide),
    loadingPermissions,
  };
};

export default useConsoleNavigationLinks;
