'use client';

import { useParams, usePathname } from 'next/navigation';

import { GoWorkflow } from 'react-icons/go';
import {
  MdCode,
  MdOutlinePrivacyTip,
  MdOutlineSupportAgent,
} from 'react-icons/md';
import {
  TbBook,
  TbChevronLeft,
  TbDashboard,
  TbDatabase,
  TbFile,
  TbHome,
  TbLogout,
  TbLogs,
  TbRun,
  TbSchema,
  TbSettings,
  TbUser,
} from 'react-icons/tb';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

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
  const { logout } = useIAM();
  const { workspace: workspaceSlug } = useParams();
  const pathname = usePathname();

  const isActiveLink = (href: string) => {
    if (href === '/console' || !href.includes('/console'))
      return pathname === href;
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await logout();
  };

  const workspaceLinks = [
    {
      title: dict.consoleNavigation.links.home,
      href: `/${locale}/console/${workspaceSlug}/home`,
      icon: <TbHome />,
    },
    {
      title: dict.consoleNavigation.links.repositories,
      href: `/${locale}/console/${workspaceSlug}/repositories`,
      icon: <TbDatabase />,
    },
    {
      title: dict.consoleNavigation.links.connections,
      href: `/${locale}/console/${workspaceSlug}/connections`,
      icon: <GoWorkflow />,
    },
    {
      title: dict.consoleNavigation.links.workflows,
      href: `/${locale}/console/${workspaceSlug}/workflows`,
      icon: <TbRun />,
    },
    {
      title: dict.consoleNavigation.links.editor,
      href: `/${locale}/console/${workspaceSlug}/editor`,
      icon: <TbFile />,
    },
    {
      title: dict.consoleNavigation.links.logs,
      href: `/${locale}/console/${workspaceSlug}/logs`,
      icon: <TbLogs />,
    },
    {
      title: dict.consoleNavigation.links.documentation,
      href: `/${locale}/console/${workspaceSlug}/documentation`,
      icon: <TbSchema />,
    },
    {
      title: dict.consoleNavigation.links.workspaceSettings,
      href: `/${locale}/console/${workspaceSlug}/settings`,
      icon: <TbSettings />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

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
      title: dict.consoleNavigation.links.myProfile,
      href: `/${locale}/console/profile`,
      icon: <TbUser />,
      active: isActiveLink(`/${locale}/console/profile`),
    },
    {
      title: dict.consoleNavigation.links.signOut,
      action: handleSignOut,
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
      icon: <MdOutlineSupportAgent />,
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
