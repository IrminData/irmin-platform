'use client';

import { GoWorkflow } from 'react-icons/go';
import { TbDatabase, TbPlayerPlay, TbRun } from 'react-icons/tb';

import { Dictionary } from '@/lib/dict';

import LinkCard from '@/components/ui/LinkCard';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Workspace } from '@/types/core/Workspace';

/**
 * Home page section for the workspace.
 */
const WorkspaceHomeSection = ({
  dict,
  workspace,
}: {
  dict: Dictionary;
  workspace: Workspace;
}) => {
  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });
  return (
    <div className='relative container mx-auto my-12 max-w-7xl px-4'>
      <div className='flex flex-col gap-8 px-4'>
        <div className='flex w-full flex-col gap-4'>
          <h2 className='font-display text-foreground/80 text-center text-3xl font-bold sm:text-4xl lg:text-5xl'>
            {workspace?.name}
          </h2>
          <p className='text-center text-sm opacity-80'>
            {dict.consoleHome.welcomeToWorkspace}
          </p>
        </div>
        <div className='flex w-full flex-wrap items-center justify-center gap-8'>
          <LinkCard
            href={`${workspaceUrl}/connections/create`}
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
            href={`${workspaceUrl}/workflows/create`}
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
  );
};

export default WorkspaceHomeSection;
