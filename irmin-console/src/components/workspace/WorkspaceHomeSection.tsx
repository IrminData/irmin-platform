import { GoWorkflow } from 'react-icons/go';
import { TbDatabase, TbPlayerPlay, TbRun } from 'react-icons/tb';

import { Dictionary } from '@/lib/dict';

import LinkCard from '@/components/ui/LinkCard';

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
  return (
    <div className='container relative mx-auto my-12 max-w-6xl px-4'>
      <div className='flex flex-col gap-8 px-4'>
        <div className='flex w-full flex-col gap-4'>
          <h2 className='text-center font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
            {workspace?.name}
          </h2>
          <p className='text-center text-sm opacity-80'>
            {dict.consoleHome.welcomeToWorkspace}
          </p>
        </div>
        <div className='flex w-full flex-wrap items-center justify-center gap-8'>
          <LinkCard
            href='connections/create'
            title={dict.consoleHome.createNewConnection}
            description={dict.consoleHome.createNewConnectionDescription}
            icon={<GoWorkflow />}
          />
          <LinkCard
            href='editor'
            title={dict.consoleHome.runScriptOnData}
            description={dict.consoleHome.runScriptOnDataDescription}
            icon={<TbPlayerPlay />}
          />
          <LinkCard
            href='workflows/create'
            title={dict.consoleHome.setupWorkflow}
            description={dict.consoleHome.setupWorkflowDescription}
            icon={<TbRun />}
          />
          <LinkCard
            href='repositories'
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
