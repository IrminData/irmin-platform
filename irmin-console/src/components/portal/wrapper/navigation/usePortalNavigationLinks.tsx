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

import { PortalNavigationLinkType } from '@/types/internal/PortalNavigation';

/**
 * Hook to get portal navigation links
 *
 * @remarks
 *
 * This hook is used to get the portal navigation links.
 * The links are defined in the code and are used in the portal navigation component.
 * Uses {@link useIAM} to interact with the user's identity and APIs.
 *
 * @returns Portal navigation links sorted by sections
 */
const usePortalNavigationLinks = (): {
  hasWorkspace: PortalNavigationLinkType[];
  noWorkspace: PortalNavigationLinkType[];
  settings: PortalNavigationLinkType[];
  useful: PortalNavigationLinkType[];
} => {
  const { locale, dict } = useLocale();
  const { logout } = useIAM();
  const { workspace: workspaceSlug } = useParams();
  const pathname = usePathname();

  const isActiveLink = (href: string) => {
    if (href === '/portal' || !href.includes('/portal'))
      return pathname === href;
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await logout();
  };

  const workspaceLinks = [
    {
      title: dict.portalNavigation.links.home,
      href: `/${locale}/portal/${workspaceSlug}/home`,
      icon: <TbHome />,
    },
    {
      title: dict.portalNavigation.links.repositories,
      href: `/${locale}/portal/${workspaceSlug}/repositories`,
      icon: <TbDatabase />,
    },
    {
      title: dict.portalNavigation.links.connections,
      href: `/${locale}/portal/${workspaceSlug}/connections`,
      icon: <GoWorkflow />,
    },
    {
      title: dict.portalNavigation.links.workflows,
      href: `/${locale}/portal/${workspaceSlug}/workflows`,
      icon: <TbRun />,
    },
    {
      title: dict.portalNavigation.links.editor,
      href: `/${locale}/portal/${workspaceSlug}/editor`,
      icon: <TbFile />,
    },
    {
      title: dict.portalNavigation.links.logs,
      href: `/${locale}/portal/${workspaceSlug}/logs`,
      icon: <TbLogs />,
    },
    {
      title: dict.portalNavigation.links.documentation,
      href: `/${locale}/portal/${workspaceSlug}/documentation`,
      icon: <TbSchema />,
    },
    {
      title: dict.portalNavigation.links.workspaceSettings,
      href: `/${locale}/portal/${workspaceSlug}/settings`,
      icon: <TbSettings />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

  const noWorkspaceLinks = [
    {
      title: dict.portalNavigation.links.workspaces,
      href: `/${locale}/portal/manage-workspaces`,
      icon: <TbDashboard />,
    },
    {
      title: dict.portalNavigation.links.goToWebsite,
      href: '/',
      icon: <TbChevronLeft />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

  const settingsLinks = [
    {
      title: dict.portalNavigation.links.myProfile,
      href: `/${locale}/portal/profile`,
      icon: <TbUser />,
      active: isActiveLink(`/${locale}/portal/profile`),
    },
    {
      title: dict.portalNavigation.links.signOut,
      action: handleSignOut,
      icon: <TbLogout />,
      active: false,
    },
  ];

  const usefulLinks = [
    {
      title: dict.portalNavigation.links.guides,
      href: `/${locale}/legal`,
      icon: <TbBook />,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.portalNavigation.links.developerDocs,
      href: `/${locale}/docs`,
      icon: <MdCode />,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.portalNavigation.links.contactSupport,
      href: `/${locale}/contact`,
      icon: <MdOutlineSupportAgent />,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.portalNavigation.links.termsAndPrivacy,
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

export default usePortalNavigationLinks;
