'use client';

import { useMemo } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import { GoGitBranch, GoGitCommit, GoGitCompare } from 'react-icons/go';
import { IoChevronBack } from 'react-icons/io5';
import { TbDatabase, TbFileDiff, TbFileText, TbSettings } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import StatusBadge from '@/components/common/status/StatusBadge';

import { useLocale } from '@/context/LocaleContext';
import { useRepository } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import BranchSelector from './branches/BranchSelector';

/**
 * Single Repository page header.
 * Provides tabs and title for the repository.
 */
export default function RepositoryHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { dict } = useLocale();

  const { currentRepository, currentRef, branches, updateCurrentRef } =
    useRepository();

  // The base URL for the repository, eg. /en/console/workspace-slug/repositories/repository-slug
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The base URL for the repositories list, eg. /en/console/workspace-slug/repositories
  const repositoriesUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
  });

  const tabs = useMemo(
    () => [
      {
        title: dict.repository.tabs.dataViewer,
        href: `${baseUrl}?${searchParams.toString()}`,
        active: pathname === `${baseUrl}`,
        icon: <TbDatabase size={14} />,
      },
      {
        title: dict.repository.tabs.commits,
        href: `${baseUrl}/commits?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/commits`,
        icon: <GoGitCommit size={14} />,
      },
      {
        title: dict.repository.tabs.branches,
        href: `${baseUrl}/branches?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/branches`,
        icon: <GoGitBranch size={14} />,
      },
      {
        title: dict.repository.tabs.compare,
        href: `${baseUrl}/compare?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/compare`,
        icon: <GoGitCompare size={14} />,
      },
      {
        title: dict.repository.tabs.documentation,
        href: `${baseUrl}/documentation?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/documentation`,
        icon: <TbFileText size={14} />,
      },
      {
        title: dict.repository.tabs.settings,
        href: `${baseUrl}/settings?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/settings`,
        icon: <TbSettings size={14} />,
        hide: currentRepository?.is_immutable,
      },
    ],
    [pathname, searchParams, baseUrl, dict, currentRepository.is_immutable]
  );

  return (
    <div
      className='container relative mx-auto max-w-6xl'
      id='repository-header'
    >
      <div className='mx-auto my-4 flex w-full flex-col px-2 md:px-4 lg:flex-row lg:items-center'>
        <div className='flex flex-1 flex-col gap-2 py-4'>
          <div className='flex flex-row items-center divide-x divide-gray-300 dark:divide-gray-700'>
            <div className='flex flex-row items-center gap-2 pr-2'>
              <span className='text-sm text-gray-400'>
                {dict.repository.repository}
              </span>
              {currentRepository.is_immutable && (
                <span className='rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                  {dict.list.immutable}
                </span>
              )}
            </div>
            <span className='px-2 text-sm text-gray-400'>
              {dict.list.owner}: {currentRepository.owner.name}
              {currentRepository.owner.company
                ? ` (${currentRepository.owner.company})`
                : ''}
            </span>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-lg font-normal text-irmin_black md:text-2xl dark:text-white'>
              {currentRepository.name}
            </h1>
            <StatusBadge accessStatus={'private'} statusLabel={'Private'} />
          </div>
          <p className='max-w-lg text-xs text-gray-400 lg:text-sm'>
            {currentRepository.description}
          </p>
        </div>
        <div className='flex min-w-60 flex-col gap-2'>
          {!pathname.includes('/compare') &&
            !pathname.includes('/settings') &&
            !pathname.includes('/branches') && (
              <>
                {/** Select branch to view repository in */}
                <BranchSelector
                  branches={branches ?? []}
                  currentRef={currentRef}
                  onSelect={(branch) => {
                    updateCurrentRef(branch.value);
                  }}
                />
                {/** Button to navigate to uncommited changes of the current branch */}
                {!pathname.includes('/uncommited-changes') &&
                  !currentRepository.is_immutable && (
                    <Button
                      variant='solid'
                      colorScheme='light'
                      size='sm'
                      href={`${baseUrl}/uncommited-changes`}
                      icon={<TbFileDiff size={18} />}
                      className='w-full'
                    >
                      {dict.repository.commit.uncommitedChanges}
                    </Button>
                  )}
              </>
            )}
        </div>
      </div>
      <div className='scrollbar-hide mb-6 flex w-full max-w-3xl justify-start gap-2 overflow-y-scroll px-4'>
        <Button
          size='sm'
          variant='icon'
          colorScheme='light'
          className='bg-gray-100 dark:bg-gray-700'
          icon={<IoChevronBack size={24} />}
          href={repositoriesUrl}
          enableTooltip={true}
          tooltipClassName='top-0 h-6'
          ariaLabel={dict.repository.allRepositories}
        />
        {tabs
          .map((tab, idx) => {
            if (tab.hide) return null;
            return (
              <Button
                key={`repository-tab-${idx}`}
                className={`rounded-none border-irmin_green px-2 hover:no-underline lg:px-1 ${tab.active ? 'border-b-2' : 'border-0'}`}
                size='sm'
                variant='link'
                colorScheme={tab.active ? 'primary' : 'gray'}
                href={tab.href}
                ariaLabel={`Tab ${tab.title}`}
                icon={tab.icon}
              >
                {tab.title}
              </Button>
            );
          })
          .filter((tab) => tab)}
      </div>
    </div>
  );
}
