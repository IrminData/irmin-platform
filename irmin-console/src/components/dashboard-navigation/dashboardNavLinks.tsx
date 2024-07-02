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
  const profile = useProfile();
  const router = useRouter();
  const { workspace: workspaceSlug } = useParams();
  const pathname = usePathname();
  const auth = AuthService.getInstance();

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
      title: 'Dashboards',
      href: `/app/${workspaceSlug}/dashboards`,
      icon: <RxDashboard />,
    },
    {
      title: 'Data sets',
      href: `/app/${workspaceSlug}/data-sets`,
      icon: <CiDatabase />,
    },
    {
      title: 'Editor',
      href: `/app/${workspaceSlug}/editor`,
      icon: <AiOutlineConsoleSql />,
    },
    {
      title: 'Connections',
      href: `/app/${workspaceSlug}/connections`,
      icon: <TbDatabaseImport />,
    },
    {
      title: 'Reverse ETL',
      href: `/app/${workspaceSlug}/reverse-etl`,
      icon: <TbDatabaseExport />,
    },
    {
      title: 'Workspace settings',
      href: `/app/${workspaceSlug}/settings`,
      icon: <TbSettings />,
    },
    {
      title: 'Marketplace',
      href: `/app/${workspaceSlug}/marketplace`,
      icon: <PiStorefront />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

  const noWorkspaceLinks = [
    {
      title: 'Workspaces',
      href: `/app`,
      icon: <RxDashboard />,
    },
    {
      title: 'Go to website',
      href: '/',
      icon: <IoChevronBackCircleOutline />,
    },
  ].map((link) => ({
    ...link,
    active: isActiveLink(link.href),
  }));

  const settingsLinks = [
    {
      title: 'My Profile',
      href: `/app/profile`,
      icon: <TbSettings />,
      active: isActiveLink(`/app/profile`),
    },
    {
      title: 'Sign out',
      action: handleSignOut,
      icon: <TbLogout />,
      active: false,
    },
  ];

  const bottomLinks = [
    {
      title: 'Contact Support',
      href: '/contact',
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: 'Privacy Policy',
      href: '/legal/privacy-policy',
      props: {
        target: '_blank',
      },
      active: false,
    },
    {
      title: 'Terms of Use',
      href: '/legal/terms-of-use',
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
