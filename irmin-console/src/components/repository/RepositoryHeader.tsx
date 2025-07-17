'use client';

import { useMemo } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { GoGitBranch, GoGitCommit, GoGitCompare } from 'react-icons/go';
import {
  TbBook,
  TbDatabase,
  TbFileText,
  TbSchema,
  TbSettings,
  TbShield,
  TbTags,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import DisplayTitle from '@/components/ui/display-title';
import StatusBadge from '@/components/ui/StatusBadge';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryBranches } from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import BranchSelector from './branches/BranchSelector';

/**
 * Single Repository page header.
 * Provides tabs and title for the repository.
 */
export default function RepositoryHeader() {
  const { dict } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isResourceAllowed } = useResourceAllowed();

  const router = useRouter();

  const { repository, immutable, currentRef, updateCurrentRef } =
    useRepositoryContext();

  const { repositoryBranchesQuery } = useRepositoryBranches(repository.slug);

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
        hidden: !isResourceAllowed('repository_commit', 'read', repository.id),
      },
      {
        name: dict.repository.tags.tags,
        link: `${baseUrl}/tags?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/tags`,
        icon: <TbTags size={14} />,
        hidden: !isResourceAllowed('repository_tag', 'read', repository.id),
      },
      {
        name: dict.repository.branches.branches,
        link: `${baseUrl}/branches?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/branches`,
        icon: <GoGitBranch size={14} />,
        hidden: !isResourceAllowed('repository_branch', 'read', repository.id),
      },
      {
        name: dict.repository.compare.compare,
        link: `${baseUrl}/compare?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/compare`,
        icon: <GoGitCompare size={14} />,
        hidden: !isResourceAllowed('repository_commit', 'read', repository.id),
      },
      {
        name: dict.documentation.documentation,
        link: `${baseUrl}/documentation?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/documentation`,
        icon: <TbFileText size={14} />,
      },
      {
        name: dict.workspace.policies,
        link: `${baseUrl}/policies?${searchParams.toString()}`,
        active: pathname === `${baseUrl}/policies`,
        icon: <TbShield size={14} />,
        hidden: !isResourceAllowed('policy', 'read'),
      },
      {
        name: dict.common.logs,
        link: `${workspaceUrl}/logs/repository/${repository?.slug}`,
        active: false,
        icon: <TbBook size={14} />,
        hidden: !isResourceAllowed('audit_log', 'read'),
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
      repository,
      workspaceUrl,
      isResourceAllowed,
    ]
  );

  const canViewBranches = useMemo(
    () => isResourceAllowed('repository_branch', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );

  return (
    <div
      className='relative container mx-auto max-w-7xl'
      id='repository-header'
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
                {dict.repository.repository}
              </span>
              {immutable && (
                <Badge variant='secondary'>{dict.list.immutable}</Badge>
              )}
            </div>
            <span className='px-2 text-sm text-gray-400'>
              {dict.list.owner}:{' '}
              {`${repository.owner.first_name} ${repository.owner.last_name}`}
              {repository.owner.company
                ? ` (${repository.owner.company})`
                : ''}{' '}
              - {repository.owner.email}
            </span>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <DisplayTitle>{repository.name}</DisplayTitle>
            <StatusBadge status={'private'} label={'Private'} />
            {/* Display tags if they exist */}
            {repository.tags && repository.tags.length > 0 && (
              <WorkspaceTagDisplay
                tags={repository.tags}
                maxVisible={3}
                size='sm'
              />
            )}
          </div>
          <p
            className={`
              max-w-lg text-xs text-gray-400
              lg:text-sm
            `}
          >
            {repository.description}
          </p>
        </div>
        <div className='flex min-w-60 flex-col gap-2'>
          {!pathname.includes('/compare') &&
            !pathname.includes('/settings') &&
            !pathname.includes('/branches') &&
            canViewBranches && (
              <>
                {/** Select branch to view repository in */}
                <BranchSelector
                  loading={repositoryBranchesQuery.isLoading}
                  branches={repositoryBranchesQuery.data?.data ?? []}
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
        onBackClick={() => {
          router.back();
        }}
        backTooltip={dict.common.back}
        tabs={tabs}
      />
    </div>
  );
}
