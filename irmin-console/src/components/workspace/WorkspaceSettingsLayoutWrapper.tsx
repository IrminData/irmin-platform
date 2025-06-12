'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import {
  TbInvoice,
  TbMail,
  TbSettings,
  TbShield,
  TbTag,
  TbUser,
} from 'react-icons/tb';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

/**
 * Component to wrap the Workspace Settings pages in.
 * Provides tabs and title.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 */
export default function WorkspaceSettingsLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { dict } = useLocale();
  const { workspaceQuery } = useWorkspaceContext();
  const { isResourceAllowed } = useResourceAllowed();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const tabs = useMemo(
    () => [
      {
        name: dict.workspace.general,
        link: `${workspaceUrl}/settings`,
        active: pathname === `${workspaceUrl}/settings`,
        icon: <TbSettings size={14} />,
        hide: !isResourceAllowed(PolicyResource.Workspace, PolicyAction.Read),
      },
      {
        name: dict.workspace.users,
        link: `${workspaceUrl}/settings/users`,
        active: pathname === `${workspaceUrl}/settings/users`,
        icon: <TbUser size={14} />,
        hide: !isResourceAllowed(PolicyResource.User, PolicyAction.Read),
      },
      {
        name: dict.workspace.policies,
        link: `${workspaceUrl}/settings/policies`,
        active: pathname === `${workspaceUrl}/settings/policies`,
        icon: <TbShield size={14} />,
        hide: !isResourceAllowed(PolicyResource.Policy, PolicyAction.Read),
      },
      {
        name: dict.workspace.invites,
        link: `${workspaceUrl}/settings/invites`,
        active: pathname === `${workspaceUrl}/settings/invites`,
        icon: <TbMail size={14} />,
        hide: !isResourceAllowed(PolicyResource.Invite, PolicyAction.Read),
      },
      {
        name: dict.workspace.tags,
        link: `${workspaceUrl}/settings/tags`,
        active: pathname === `${workspaceUrl}/settings/tags`,
        icon: <TbTag size={14} />,
        hide: !isResourceAllowed(
          PolicyResource.WorkspaceTag,
          PolicyAction.Read
        ),
      },
      {
        name: dict.workspace.billing,
        link: `${workspaceUrl}/settings/billing`,
        active: pathname === `${workspaceUrl}/settings/billing`,
        icon: <TbInvoice size={14} />,
        hide: !isResourceAllowed(PolicyResource.Billing, PolicyAction.Read),
      },
    ],
    [pathname, dict, workspaceUrl, isResourceAllowed]
  );

  if (!workspaceQuery?.data) {
    return (
      <div className='relative container mx-auto max-w-7xl py-12'>
        <LoadingSkeleton className='h-96' />
      </div>
    );
  }

  return (
    <>
      <div className='relative container mx-auto max-w-7xl'>
        <div className='mx-auto my-8 flex w-full flex-col gap-2 px-2 md:px-4'>
          <h1 className='font-display text-foreground/90 text-3xl font-bold sm:text-4xl lg:text-5xl'>
            {dict.consoleNavigation.workspaceSettings}
          </h1>
          <p className='max-w-lg text-base text-gray-400 lg:text-lg'>
            {workspaceQuery?.data?.data?.name ?? ''}
          </p>
        </div>
        <TabsWithBackButton
          backHref={`${workspaceUrl}/home`}
          backTooltip={dict.consoleNavigation.workspace}
          tabs={tabs}
        />
      </div>
      <div>{children}</div>
    </>
  );
}
