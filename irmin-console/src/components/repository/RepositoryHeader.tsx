'use client';

import { useMemo } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import { GoGitBranch, GoGitCommit, GoGitCompare } from 'react-icons/go';
import {
  TbBook,
  TbDatabase,
  TbFileText,
  TbSchema,
  TbSettings,
  TbTags,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/ui/StatusBadge';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';

import { useLocale } from '@/context/LocaleContext';
import { useRepository } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import BranchSelector from './branches/BranchSelector';

/**
 * Single Repository page header.
 * Provides tabs and title for the repository.
 */
export default function RepositoryHeader() {
  const { dict } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    currentRepository,
    immutable,
    currentRef,
    branches,
    updateCurrentRef,
  } = useRepository();

  /** The base URL for the repository, eg. /en/workspace/workspace-slug/repositories/repository-slug */
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
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

  const tabs = useMemo(
    () => [
      {
        name: dict.repository.objects.objects,
        link: `${baseUrl}?${searchParams.toString()}`,
        active: pathname === `${baseUrl}`,
        icon: <TbDatabase size={14} />,
      },
      {
        name: dict.repository.schema.schema,
        link: `${baseUrl}/schema?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/schema`,
        icon: <TbSchema size={14} />,
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
        name: dict.common.logs,
        link: `${workspaceUrl}/logs/repository/${currentRepository?.slug}`,
        active: false,
        icon: <TbBook size={14} />,
      },
      {
        name: dict.consoleNavigation.settings,
        link: `${baseUrl}/settings?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/settings`,
        icon: <TbSettings size={14} />,
        hidden: immutable,
      },
    ],
    [
      pathname,
      searchParams,
      baseUrl,
      dict,
      immutable,
      currentRepository,
      workspaceUrl,
    ]
  );

  return (
    <div
      className='relative container mx-auto max-w-7xl'
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
            <h1 className='text-foreground text-lg font-normal md:text-2xl'>
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
