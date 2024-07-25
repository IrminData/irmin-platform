'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';

import AuthService from '@/lib/api/AuthService';

import { AiOutlineConsoleSql } from 'react-icons/ai';
import { CiDatabase } from 'react-icons/ci';
import { IoChevronBackCircleOutline } from 'react-icons/io5';
import { PiStorefront } from 'react-icons/pi';
import { RxDashboard } from 'react-icons/rx';
import {
  TbDatabaseExport,
  TbDatabaseImport,
  TbLogout,
  TbPlayerPlay,
  TbSettings,
} from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';
import { useProfile } from '@/context/ProfileContext';

import { PortalNavigationLink } from '@/types/internal/PortalNavigation';

/**
 * Hook to get portal navigation links
 *
 * @remarks
 *
 * This hook is used to get the portal navigation links.
 * The links are defined in the code and are used in the portal navigation component.
 *
 * @returns Portal navigation links
 */
export const usePortalNavLinks = (): {
  hasWorkspace: PortalNavigationLink[];
  noWorkspace: PortalNavigationLink[];
  settings: PortalNavigationLink[];
  bottom: PortalNavigationLink[];
} => {
  const { locale, dict } = useLocale();
  const profile = useProfile();
  const router = useRouter();
  const { workspace: workspaceSlug } = useParams();
  const pathname = usePathname();
  const auth = AuthService.getInstance(locale);

  const isActiveLink = (href: string) => {
    if (href === '/portal' || !href.includes('/portal'))
      return pathname === href;
    return pathname.startsWith(href);
  };

  const handleSignOut = () => {
    auth.logout().then(() => {
      profile.fetchProfile();
      router.push('/sign-in');
    });
  };

  const workspaceLinks = [
    {
      title: dict.portalNavigation.links.dashboards,
      href: `/${locale}/portal/${workspaceSlug}/dashboards`,
      icon: <RxDashboard />,
    },
    {
      title: dict.portalNavigation.links.datasets,
      href: `/${locale}/portal/${workspaceSlug}/datasets`,
      icon: <CiDatabase />,
    },
    {
      title: dict.portalNavigation.links.editor,
      href: `/${locale}/portal/${workspaceSlug}/editor`,
      icon: <AiOutlineConsoleSql />,
    },
    {
      title: dict.portalNavigation.links.actions,
      href: `/${locale}/portal/${workspaceSlug}/actions`,
      icon: <TbPlayerPlay />,
    },
    {
      title: dict.portalNavigation.links.connections,
      href: `/${locale}/portal/${workspaceSlug}/connections`,
      icon: <TbDatabaseImport />,
    },
    {
      title: dict.portalNavigation.links.exportSyncs,
      href: `/${locale}/portal/${workspaceSlug}/export-sync`,
      icon: <TbDatabaseExport />,
    },
    {
      title: dict.portalNavigation.links.workspaceSettings,
      href: `/${locale}/portal/${workspaceSlug}/settings`,
      icon: <TbSettings />,
    },
    {
      title: dict.portalNavigation.links.marketplace,
      href: `/${locale}/portal/${workspaceSlug}/marketplace`,
      icon: <PiStorefront />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

  const noWorkspaceLinks = [
    {
      title: dict.portalNavigation.links.workspaces,
      href: `/portal`,
      icon: <RxDashboard />,
    },
    {
      title: dict.portalNavigation.links.goToWebsite,
      href: '/',
      icon: <IoChevronBackCircleOutline />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

  const settingsLinks = [
    {
      title: dict.portalNavigation.links.myProfile,
      href: `/${locale}/portal/profile`,
      icon: <TbSettings />,
      active: isActiveLink(`/${locale}/portal/profile`),
    },
    {
      title: dict.portalNavigation.links.signOut,
      action: handleSignOut,
      icon: <TbLogout />,
      active: false,
    },
  ];

  const bottomLinks = [
    {
      title: dict.portalNavigation.links.contactSupport,
      href: `/${locale}/contact`,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.portalNavigation.links.privacyPolicy,
      href: `/${locale}/legal/privacy-policy`,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.portalNavigation.links.termsOfUse,
      href: `/${locale}/legal/terms-of-use`,
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
    bottom: bottomLinks,
  };
};
