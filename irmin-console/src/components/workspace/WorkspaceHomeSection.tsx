'use client';

import Link from 'next/link';

import { GoWorkflow } from 'react-icons/go';
import { TbDatabase, TbPlayerPlay, TbRun } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Home page section for the workspace.
 */
const WorkspaceHomeSection = () => {
  const { dict } = useLocale();
  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();
  return (
    <div className='flex flex-col gap-8 px-4 py-12'>
      <div className='flex w-full flex-col gap-4'>
        <h2 className='text-center font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
          {currentWorkspace?.name}
        </h2>
        <p className='text-center text-sm opacity-80'>
          {dict.portalHome.welcomeToWorkspace}
        </p>
      </div>
      <div className='flex w-full flex-wrap items-center justify-center gap-8'>
        <Link
          href='connections'
          className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg bg-white p-4 text-center text-irmin_blue shadow transition-all hover:opacity-80 md:p-6 md:py-8 dark:bg-gray-800 dark:text-white dark:shadow-gray-700'
        >
          <div className='aspect-square rounded-full bg-gray-200 p-4 dark:bg-gray-700'>
            <GoWorkflow className='text-2xl lg:text-4xl' />
          </div>
          <h2 className='text-base font-medium lg:text-lg'>
            {dict.portalHome.createNewConnection}
          </h2>
          <p className='text-xs text-gray-600 lg:text-sm dark:text-gray-400'>
            {dict.portalHome.createNewConnectionDescription}
          </p>
        </Link>

        <Link
          href='editor'
          className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg bg-white p-4 text-center text-irmin_blue shadow transition-all hover:opacity-80 md:p-6 md:py-8 dark:bg-gray-800 dark:text-white dark:shadow-gray-700'
        >
          <div className='aspect-square rounded-full bg-gray-200 p-4 dark:bg-gray-700'>
            <TbPlayerPlay className='text-2xl lg:text-4xl' />
          </div>
          <h2 className='text-base font-medium lg:text-lg'>
            {dict.portalHome.runScriptOnData}
          </h2>
          <p className='text-xs text-gray-600 lg:text-sm dark:text-gray-400'>
            {dict.portalHome.runScriptOnDataDescription}
          </p>
        </Link>

        <Link
          href='workflows'
          className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg bg-white p-4 text-center text-irmin_blue shadow transition-all hover:opacity-80 md:p-6 md:py-8 dark:bg-gray-800 dark:text-white dark:shadow-gray-700'
        >
          <div className='aspect-square rounded-full bg-gray-200 p-4 dark:bg-gray-700'>
            <TbRun className='text-2xl lg:text-4xl' />
          </div>
          <h2 className='text-base font-medium lg:text-lg'>
            {dict.portalHome.setupWorkflow}
          </h2>
          <p className='text-xs text-gray-600 lg:text-sm dark:text-gray-400'>
            {dict.portalHome.setupWorkflowDescription}
          </p>
        </Link>

        <Link
          href='repositories'
          className='flex w-96 max-w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg bg-white p-4 text-center text-irmin_blue shadow transition-all hover:opacity-80 md:p-6 md:py-8 dark:bg-gray-800 dark:text-white dark:shadow-gray-700'
        >
          <div className='aspect-square rounded-full bg-gray-200 p-4 dark:bg-gray-700'>
            <TbDatabase className='text-2xl lg:text-4xl' />
          </div>
          <h2 className='text-base font-medium lg:text-lg'>
            {dict.portalHome.browseRepositories}
          </h2>
          <p className='text-xs text-gray-600 lg:text-sm dark:text-gray-400'>
            {dict.portalHome.browseRepositoriesDescription}
          </p>
        </Link>
      </div>
    </div>
  );
};

export default WorkspaceHomeSection;
