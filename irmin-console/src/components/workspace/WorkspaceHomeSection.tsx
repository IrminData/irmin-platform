'use client';

import { GoWorkflow } from 'react-icons/go';
import {
  TbDatabase,
  TbLogs,
  TbPlayerPlay,
  TbRun,
  TbSchema,
  TbSettings,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { QueryError } from '@/components/ui/error/QueryError';
import LinkCard from '@/components/ui/LinkCard';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

/**
 * Home page section for the workspace.
 */
const WorkspaceHomeSection = () => {
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

  if (workspaceQuery?.isError) {
    return (
      <div className='pattern-bg h-full py-12'>
        <div className='relative container mx-auto max-w-6xl px-4'>
          <QueryError
            error={workspaceQuery.error}
            onRetry={() => workspaceQuery.refetch()}
            title={dict.common.somethingWentWrong}
          />
        </div>
      </div>
    );
  }

  return (
    <div className='pattern-bg h-full py-12'>
      <div className='relative container mx-auto max-w-6xl px-4'>
        <div className='flex flex-col gap-8 px-4'>
          <div className='flex w-full flex-col gap-4'>
            {workspaceQuery?.data?.data?.name ? (
              <DisplayTitle className='text-center'>
                {workspaceQuery?.data?.data?.name ?? ''}
              </DisplayTitle>
            ) : (
              <div className='mx-auto w-1/2 max-w-80'>
                <LoadingSkeleton className='mx-auto h-14 w-full' />
              </div>
            )}
            <p className='text-center text-sm opacity-80'>
              {dict.consoleHome.welcomeToWorkspace}
            </p>
          </div>
          <div
            className={`flex w-full flex-wrap items-center justify-center gap-8`}
          >
            {isResourceAllowed('connection', 'read') && (
              <LinkCard
                href={`${workspaceUrl}/connections`}
                title={dict.consoleHome.createNewConnection}
                description={dict.consoleHome.createNewConnectionDescription}
                icon={<GoWorkflow />}
              />
            )}
            {isResourceAllowed('editor_script', 'read') && (
              <LinkCard
                href={`${workspaceUrl}/editor`}
                title={dict.consoleHome.runScriptOnData}
                description={dict.consoleHome.runScriptOnDataDescription}
                icon={<TbPlayerPlay />}
              />
            )}
            {isResourceAllowed('workflow', 'read') && (
              <LinkCard
                href={`${workspaceUrl}/workflows`}
                title={dict.consoleHome.setupWorkflow}
                description={dict.consoleHome.setupWorkflowDescription}
                icon={<TbRun />}
              />
            )}
            {isResourceAllowed('repository', 'read') && (
              <LinkCard
                href={`${workspaceUrl}/repositories`}
                title={dict.consoleHome.browseRepositories}
                description={dict.consoleHome.browseRepositoriesDescription}
                icon={<TbDatabase />}
              />
            )}
          </div>
          <div className='flex flex-row justify-center gap-2 pb-12'>
            {isResourceAllowed('workspace', 'read') && (
              <Button
                href={`${workspaceUrl}/settings`}
                variant='gray'
                size='sm'
                icon={<TbSettings className='size-4' />}
              >
                {dict.consoleNavigation.settings}
              </Button>
            )}
            {isResourceAllowed('audit_log', 'read') && (
              <Button
                href={`${workspaceUrl}/logs`}
                variant='gray'
                size='sm'
                icon={<TbLogs className='size-4' />}
              >
                {dict.common.logs}
              </Button>
            )}
            {isResourceAllowed('documentation', 'read') && (
              <Button
                href={`${workspaceUrl}/documentation`}
                variant='gray'
                size='sm'
                icon={<TbSchema className='size-4' />}
              >
                {dict.documentation.documentation}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceHomeSection;
