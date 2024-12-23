'use client';

import { useMemo } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import { GoGitBranch, GoGitCommit, GoGitCompare } from 'react-icons/go';
import {
  TbDatabase,
  TbFileText,
  TbLogs,
  TbSettings,
  TbTags,
} from 'react-icons/tb';

import { Dictionary } from '@/lib/dict';

import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/ui/StatusBadge';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';

import { useRepository } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import BranchSelector from './branches/BranchSelector';

/**
 * Single Repository page header.
 * Provides tabs and title for the repository.
 */
export default function RepositoryHeader({
  dict,
  repositorySlug,
}: {
  dict: Dictionary;
  repositorySlug: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    currentRepository,
    immutable,
    currentRef,
    branches,
    updateCurrentRef,
  } = useRepository();

  /** The base URL for the repository, eg. /en/console/workspace-slug/repositories/repository-slug */
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const tabs = useMemo(
    () => [
      {
        name: dict.repository.objects.objects,
        link: `${baseUrl}?${searchParams.toString()}`,
        active: pathname === `${baseUrl}`,
        icon: <TbDatabase size={14} />,
      },
      {
        name: dict.repository.commit.commits,
        link: `${baseUrl}/commits?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/commits`,
        icon: <GoGitCommit size={14} />,
      },
      {
        name: dict.repository.tags.tags,
        link: `${baseUrl}/tags?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/tags`,
        icon: <TbTags size={14} />,
      },
      {
        name: dict.repository.branches.branches,
        link: `${baseUrl}/branches?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/branches`,
        icon: <GoGitBranch size={14} />,
      },
      {
        name: dict.repository.compare.compare,
        link: `${baseUrl}/compare?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/compare`,
        icon: <GoGitCompare size={14} />,
      },
      {
        name: dict.documentation.documentation,
        link: `${baseUrl}/documentation?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/documentation`,
        icon: <TbFileText size={14} />,
      },
      {
        name: dict.consoleNavigation.settings,
        link: `${baseUrl}/settings?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/settings`,
        icon: <TbSettings size={14} />,
        hidden: immutable,
      },
      {
        name: dict.workflow.tabs.logs,
        link: `${workspaceUrl}/logs/repository/${repositorySlug}`,
        active: false,
        icon: <TbLogs size={14} />,
        hidden: false,
      },
    ],
    [
      pathname,
      workspaceUrl,
      searchParams,
      baseUrl,
      repositorySlug,
      dict,
      immutable,
    ]
  );

  return (
    <div
      className='container relative mx-auto max-w-7xl'
      id='repository-header'
    >
      <div className='mx-auto my-4 flex w-full flex-col px-2 md:px-4 lg:flex-row lg:items-center'>
        <div className='flex flex-1 flex-col gap-2 py-4'>
          <div className='flex flex-row items-center divide-x divide-gray-300 dark:divide-gray-700'>
            <div className='flex flex-row items-center gap-2 pr-2'>
              <span className='text-sm text-gray-400'>
                {dict.repository.repository}
              </span>
              {immutable && (
                <Badge variant='secondary'>{dict.list.immutable}</Badge>
              )}
            </div>
            <span className='px-2 text-sm text-gray-400'>
              {dict.list.owner}:{' '}
              {`${currentRepository.owner.first_name} ${currentRepository.owner.last_name}`}
              {currentRepository.owner.company
                ? ` (${currentRepository.owner.company})`
                : ''}{' '}
              - {currentRepository.owner.email}
            </span>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-lg font-normal text-foreground md:text-2xl'>
              {currentRepository.name}
            </h1>
            <StatusBadge status={'private'} label={'Private'} />
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
              </>
            )}
        </div>
      </div>
      <TabsWithBackButton
        backHref={`${workspaceUrl}/repositories`}
        backTooltip={dict.repository.repositories}
        tabs={tabs}
      />
    </div>
  );
}
