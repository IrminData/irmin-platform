'use client';

import React, { ComponentPropsWithoutRef } from 'react';

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
  TbSettings,
} from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';
import { useProfile } from '@/context/ProfileContext';

export interface DashboardNavLinkType {
  title: string;
  active: boolean;
  icon?: React.ReactNode;
  href?: string;
  action?: () => void;
  props?: ComponentPropsWithoutRef<'a'> | ComponentPropsWithoutRef<'button'>;
}

export const useDashboardNavLinks = (): {
  hasWorkspace: DashboardNavLinkType[];
  noWorkspace: DashboardNavLinkType[];
  settings: DashboardNavLinkType[];
  bottom: DashboardNavLinkType[];
} => {
  const { locale, dict } = useLocale();
  const profile = useProfile();
  const router = useRouter();
  const { workspace: workspaceSlug } = useParams();
  const pathname = usePathname();
  const auth = AuthService.getInstance(locale);

  const isActiveLink = (href: string) => {
    if (href === '/app' || !href.includes('/app')) return pathname === href;
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
      title: dict.dashboardNavigation.links.dashboards,
      href: `/${locale}/app/${workspaceSlug}/dashboards`,
      icon: <RxDashboard />,
    },
    {
      title: dict.dashboardNavigation.links.dataSets,
      href: `/${locale}/app/${workspaceSlug}/data-sets`,
      icon: <CiDatabase />,
    },
    {
      title: dict.dashboardNavigation.links.editor,
      href: `/${locale}/app/${workspaceSlug}/editor`,
      icon: <AiOutlineConsoleSql />,
    },
    {
      title: dict.dashboardNavigation.links.connections,
      href: `/${locale}/app/${workspaceSlug}/connections`,
      icon: <TbDatabaseImport />,
    },
    {
      title: dict.dashboardNavigation.links.exportSyncs,
      href: `/${locale}/app/${workspaceSlug}/export-sync`,
      icon: <TbDatabaseExport />,
    },
    {
      title: dict.dashboardNavigation.links.workspaceSettings,
      href: `/${locale}/app/${workspaceSlug}/settings`,
      icon: <TbSettings />,
    },
    {
      title: dict.dashboardNavigation.links.marketplace,
      href: `/${locale}/app/${workspaceSlug}/marketplace`,
      icon: <PiStorefront />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

  const noWorkspaceLinks = [
    {
      title: dict.dashboardNavigation.links.workspaces,
      href: `/app`,
      icon: <RxDashboard />,
    },
    {
      title: dict.dashboardNavigation.links.goToWebsite,
      href: '/',
      icon: <IoChevronBackCircleOutline />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

  const settingsLinks = [
    {
      title: dict.dashboardNavigation.links.myProfile,
      href: `/${locale}/app/profile`,
      icon: <TbSettings />,
      active: isActiveLink(`/${locale}/app/profile`),
    },
    {
      title: dict.dashboardNavigation.links.signOut,
      action: handleSignOut,
      icon: <TbLogout />,
      active: false,
    },
  ];

  const bottomLinks = [
    {
      title: dict.dashboardNavigation.links.contactSupport,
      href: `/${locale}/contact`,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.dashboardNavigation.links.privacyPolicy,
      href: `/${locale}/legal/privacy-policy`,
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: dict.dashboardNavigation.links.termsOfUse,
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
