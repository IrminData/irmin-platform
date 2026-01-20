'use client';

import { useMemo } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import {
  TbActivity,
  TbBook,
  TbBrain,
  TbFileText,
  TbSettings,
  TbShield,
} from 'react-icons/tb';

import DisplayTitle from '@/components/ui/display-title';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

/**
 * Single AI Application page header.
 * Provides tabs and title for the AI Application.
 */
export default function AIApplicationHeader() {
  const { dict } = useLocale();
  const pathname = usePathname();
  const { isResourceAllowed } = useResourceAllowed();
  const router = useRouter();

  const { aiApplication } = useAIApplicationContext();
  useWorkspaceContext();

  /** The base URL for the AI Application, eg. /en/workspace/workspace-slug/ai-applications/ai-app-id */
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'ai-applications',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The AI applications list URL
  const aiApplicationsListUrl = `${workspaceUrl}/ai-applications`;

  const tabs = useMemo(
    () => [
      {
        name: dict.common.overview,
        link: baseUrl,
        active: pathname === baseUrl,
        icon: <TbBrain size={14} />,
      },
      {
        name: dict.aiApplication.activity,
        link: `${baseUrl}/activity`,
        active: pathname === `${baseUrl}/activity`,
        icon: <TbActivity size={14} />,
        hidden: !isResourceAllowed('audit_log', 'read'),
      },
      {
        name: dict.documentation.documentation,
        link: `${baseUrl}/documentation`,
        active: pathname === `${baseUrl}/documentation`,
        icon: <TbFileText size={14} />,
      },
      {
        name: dict.workspace.policies,
        link: `${baseUrl}/policies`,
        active: pathname === `${baseUrl}/policies`,
        icon: <TbShield size={14} />,
        hidden: !isResourceAllowed('policy', 'read'),
      },
      {
        name: dict.common.logs,
        link: `${workspaceUrl}/logs/ai-application/${aiApplication?.id}`,
        active: false,
        icon: <TbBook size={14} />,
        hidden: !isResourceAllowed('audit_log', 'read'),
      },
      {
        name: dict.consoleNavigation.settings,
        link: `${baseUrl}/settings`,
        active: pathname === `${baseUrl}/settings`,
        icon: <TbSettings size={14} />,
      },
    ],
    [pathname, baseUrl, dict, aiApplication, workspaceUrl, isResourceAllowed]
  );

  // Count enabled tools
  const enabledToolsCount = aiApplication.tools
    ? Object.values(aiApplication.tools).filter(Boolean).length
    : 0;

  return (
    <div
      className='relative container mx-auto max-w-7xl'
      id='ai-application-header'
    >
      <div
        className={`
          mx-auto my-4 flex w-full flex-col px-2
          md:px-4
          lg:flex-row lg:items-center
        `}
      >
        <div className='flex flex-1 flex-col gap-2 py-4'>
          <div
            className={`
              flex flex-row items-center divide-x divide-gray-300
              dark:divide-gray-700
            `}
          >
            <div className='flex flex-row items-center gap-2 pr-2'>
              <span className='text-sm text-gray-400'>
                {dict.aiApplication.aiApplication}
              </span>
            </div>
            <span className='px-2 text-sm text-gray-400'>
              {dict.list.owner}:{' '}
              {`${aiApplication.owner.first_name} ${aiApplication.owner.last_name}`}
              {aiApplication.owner.company
                ? ` (${aiApplication.owner.company})`
                : ''}{' '}
              - {aiApplication.owner.email}
            </span>
          </div>
          <DisplayTitle>{aiApplication.name}</DisplayTitle>
          <p
            className={`
              max-w-lg text-xs text-gray-400
              lg:text-sm
            `}
          >
            {aiApplication.description || dict.wizard.noDescription}
          </p>
          <div
            className={`flex flex-wrap items-center gap-2 text-xs text-gray-500`}
          >
            <span>
              {aiApplication.data_sources?.length ?? 0}{' '}
              {(aiApplication.data_sources?.length ?? 0) !== 1
                ? dict.aiApplication.dataSources
                : dict.aiApplication.dataSource}
            </span>
            <span>•</span>
            <span>
              {enabledToolsCount}{' '}
              {enabledToolsCount !== 1
                ? dict.aiApplication.toolsEnabled
                : dict.aiApplication.toolEnabled}
            </span>
          </div>
          {/* Display tags if they exist */}
          {aiApplication.tags && aiApplication.tags.length > 0 && (
            <div className='flex flex-wrap items-center gap-2'>
              <WorkspaceTagDisplay
                tags={aiApplication.tags}
                maxVisible={3}
                size='sm'
              />
            </div>
          )}
        </div>
      </div>
      <TabsWithBackButton
        onBackClick={() => {
          router.push(aiApplicationsListUrl);
        }}
        backTooltip={dict.common.back}
        tabs={tabs}
      />
    </div>
  );
}
