'use client';

import { GoWorkflow } from 'react-icons/go';
import { TbDatabase, TbPlayerPlay, TbRun } from 'react-icons/tb';

import QueryError from '@/components/ui/error/QueryError';
import LinkCard from '@/components/ui/LinkCard';
import PageSkeleton from '@/components/ui/loading/PageSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import useBaseUrl from '@/hooks/useBaseUrl';

/**
 * Home page section for the workspace.
 */
const WorkspaceHomeSection = () => {
  const { dict } = useLocale();
  const { workspaceQuery } = useWorkspaceContext();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  if (workspaceQuery?.isLoading) {
    return (
      <div className='pattern-bg h-full py-12'>
        <div className='relative container mx-auto max-w-6xl px-4'>
          <PageSkeleton showHeader={true} contentRows={2} />
        </div>
      </div>
    );
  }

  if (workspaceQuery?.error) {
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
            <h2 className='font-display text-foreground/90 text-center text-3xl font-bold sm:text-4xl lg:text-5xl'>
              {workspaceQuery?.data?.data?.name ?? ''}
            </h2>
            <p className='text-center text-sm opacity-80'>
              {dict.consoleHome.welcomeToWorkspace}
            </p>
          </div>
          <div className='flex w-full flex-wrap items-center justify-center gap-8'>
            <LinkCard
              href={`${workspaceUrl}/connections?create`}
              title={dict.consoleHome.createNewConnection}
              description={dict.consoleHome.createNewConnectionDescription}
              icon={<GoWorkflow />}
            />
            <LinkCard
              href={`${workspaceUrl}/editor`}
              title={dict.consoleHome.runScriptOnData}
              description={dict.consoleHome.runScriptOnDataDescription}
              icon={<TbPlayerPlay />}
            />
            <LinkCard
              href={`${workspaceUrl}/workflows?create`}
              title={dict.consoleHome.setupWorkflow}
              description={dict.consoleHome.setupWorkflowDescription}
              icon={<TbRun />}
            />
            <LinkCard
              href={`${workspaceUrl}/repositories`}
              title={dict.consoleHome.browseRepositories}
              description={dict.consoleHome.browseRepositoriesDescription}
              icon={<TbDatabase />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceHomeSection;
