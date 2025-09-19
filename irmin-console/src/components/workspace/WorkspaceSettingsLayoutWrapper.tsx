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

import DisplayTitle from '@/components/ui/display-title';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

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
        hide: !isResourceAllowed('workspace', 'read'),
      },
      {
        name: dict.workspace.users,
        link: `${workspaceUrl}/settings/users`,
        active: pathname === `${workspaceUrl}/settings/users`,
        icon: <TbUser size={14} />,
        hide: !isResourceAllowed('user', 'read'),
      },
      {
        name: dict.workspace.policies,
        link: `${workspaceUrl}/settings/policies`,
        active: pathname === `${workspaceUrl}/settings/policies`,
        icon: <TbShield size={14} />,
        hide: !isResourceAllowed('policy', 'read'),
      },
      {
        name: dict.workspace.invites,
        link: `${workspaceUrl}/settings/invites`,
        active: pathname === `${workspaceUrl}/settings/invites`,
        icon: <TbMail size={14} />,
        hide: !isResourceAllowed('invite', 'read'),
      },
      {
        name: dict.workspace.tags,
        link: `${workspaceUrl}/settings/tags`,
        active: pathname === `${workspaceUrl}/settings/tags`,
        icon: <TbTag size={14} />,
        hide: !isResourceAllowed('workspace_tag', 'read'),
      },
      {
        name: dict.workspace.billing,
        link: `${workspaceUrl}/settings/billing`,
        active: pathname === `${workspaceUrl}/settings/billing`,
        icon: <TbInvoice size={14} />,
        hide: !isResourceAllowed('billing', 'read'),
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
        <div
          className={`
            mx-auto my-8 flex w-full flex-col gap-2 px-2
            md:px-4
          `}
        >
          <DisplayTitle>{workspaceQuery?.data?.data?.name ?? ''}</DisplayTitle>
          <p
            className={`
              max-w-lg text-base text-gray-400
              lg:text-lg
            `}
          >
            {dict.consoleNavigation.workspaceSettings}
          </p>
        </div>
        <TabsWithBackButton
          backHref={`${workspaceUrl}/dashboard`}
          backTooltip={dict.consoleNavigation.workspace}
          tabs={tabs}
        />
      </div>
      <div>{children}</div>
    </>
  );
}
