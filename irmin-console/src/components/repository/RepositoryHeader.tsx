'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { GoGitBranch, GoGitCommit, GoGitCompare } from 'react-icons/go';
import {
  TbBook,
  TbDatabase,
  TbFileText,
  TbLink,
  TbSchema,
  TbSettings,
  TbShield,
  TbTags,
} from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AssetSharePopover from '@/components/ui/policy-editor/AssetSharePopover';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import StatusBadge from '@/components/ui/StatusBadge';
import TabsWithBackButton from '@/components/ui/tabs/TabsWithBackButton';
import WorkspaceTagDisplay from '@/components/workspace/WorkspaceTagDisplay';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepositoryBranches, useRepositoryObject } from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import BranchSelector from './branches/BranchSelector';

/**
 * Single Repository page header.
 * Provides tabs and title for the repository.
 */
export default function RepositoryHeader() {
  return (
    <Suspense>
      <RepositoryHeaderContent />
    </Suspense>
  );
}

function RepositoryHeaderContent() {
  const { dict } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isResourceAllowed } = useResourceAllowed();
  const { irminAlert } = usePopup();

  const router = useRouter();

  const { repository, immutable, currentRef, updateCurrentRef } =
    useRepositoryContext();

  const { repositoryBranchesQuery } = useRepositoryBranches(repository.slug);
  const { createSignedZipURLMutation } = useRepositoryObject(repository.slug);

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

  // The repositories list URL
  const repositoriesListUrl = `${workspaceUrl}/repositories`;

  // Build search params string with only the ref parameter
  // This prevents page-specific params like `path` and `object` from leaking across tabs
  const tabSearchParams = useMemo(() => {
    const ref = searchParams.get('ref');
    if (!ref) return '';
    const params = new URLSearchParams();
    params.set('ref', ref);
    return params.toString();
  }, [searchParams]);

  /** Helper to build tab link with only the ref param */
  const tabLink = useCallback(
    (path: string) => (tabSearchParams ? `${path}?${tabSearchParams}` : path),
    [tabSearchParams]
  );

  const tabs = useMemo(
    () => [
      {
        name: dict.repository.objects.objects,
        link: tabLink(baseUrl),
        active: pathname === `${baseUrl}`,
        icon: <TbDatabase size={14} />,
      },
      {
        name: dict.repository.schema.schema,
        link: tabLink(`${baseUrl}/schema`),
        active: pathname === `${baseUrl}/schema`,
        icon: <TbSchema size={14} />,
      },
      {
        name: dict.repository.commit.commits,
        link: tabLink(`${baseUrl}/commits`),
        active: pathname === `${baseUrl}/commits`,
        icon: <GoGitCommit size={14} />,
        hidden: !isResourceAllowed('repository_commit', 'read', repository.id),
      },
      {
        name: dict.repository.tags.tags,
        link: tabLink(`${baseUrl}/tags`),
        active: pathname === `${baseUrl}/tags`,
        icon: <TbTags size={14} />,
        hidden: !isResourceAllowed('repository_tag', 'read', repository.id),
      },
      {
        name: dict.repository.branches.branches,
        link: tabLink(`${baseUrl}/branches`),
        active: pathname === `${baseUrl}/branches`,
        icon: <GoGitBranch size={14} />,
        hidden: !isResourceAllowed('repository_branch', 'read', repository.id),
      },
      {
        name: dict.repository.compare.compare,
        link: tabLink(`${baseUrl}/compare`),
        active: pathname === `${baseUrl}/compare`,
        icon: <GoGitCompare size={14} />,
        hidden: !isResourceAllowed('repository_commit', 'read', repository.id),
      },
    ],
    [pathname, tabLink, baseUrl, dict, repository, isResourceAllowed]
  );

  const moreTabs = useMemo(
    () => [
      {
        // UI label is "README"; route path, data field (repository.documentation),
        // and permission key all keep the internal "documentation" name to
        // match API / DB / core SDK. Tooltip explains the connection to the
        // workspace catalog for non-technical users.
        name: dict.catalog.readme,
        tooltip: dict.catalog.readmeTooltip,
        link: tabLink(`${baseUrl}/documentation`),
        active: pathname === `${baseUrl}/documentation`,
        icon: <TbFileText size={14} />,
      },
      {
        name: dict.workspace.policies,
        link: tabLink(`${baseUrl}/policies`),
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
        link: tabLink(`${baseUrl}/settings`),
        active: pathname === `${baseUrl}/settings`,
        icon: <TbSettings size={14} />,
        hidden: immutable,
      },
    ],
    [
      pathname,
      tabLink,
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

  // Share zip link state
  const [zipSharePopoverOpen, setZipSharePopoverOpen] = useState(false);
  const [zipShareExpiry, setZipShareExpiry] = useState('24');
  const [zipCustomHours, setZipCustomHours] = useState('48');
  const [generatingZipLink, setGeneratingZipLink] = useState(false);

  const handleShareZip = useCallback(async () => {
    setGeneratingZipLink(true);
    try {
      const expiresInHours =
        zipShareExpiry === 'never'
          ? 0
          : zipShareExpiry === 'custom'
            ? parseInt(zipCustomHours, 10) || 24
            : parseInt(zipShareExpiry, 10);
      const result = await createSignedZipURLMutation.mutateAsync({
        ref: currentRef ?? '',
        expiresInHours,
      });
      try {
        await navigator.clipboard.writeText(result.url);
        const expiryLabel =
          zipShareExpiry === 'custom'
            ? `${zipCustomHours} ${dict.repository.objects.shareLinkCustomHours.toLowerCase()}`
            : dict.repository.objects.shareLinkExpiryOptions[
                zipShareExpiry as keyof typeof dict.repository.objects.shareLinkExpiryOptions
              ];
        irminAlert(
          'success',
          `${dict.repository.shareZipLinkCopied} (${expiryLabel})`
        );
      } catch {
        irminAlert(
          'error',
          dict.common.errors.mutations.createZipShareLinkFailed
        );
      }
      setZipSharePopoverOpen(false);
    } catch (error) {
      console.error('Error creating zip share link:', error);
    } finally {
      setGeneratingZipLink(false);
    }
  }, [
    createSignedZipURLMutation,
    currentRef,
    zipShareExpiry,
    zipCustomHours,
    irminAlert,
    dict,
  ]);

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
              {dict.common.owner}:{' '}
              {`${repository.owner.first_name} ${repository.owner.last_name}`}
              {repository.owner.company
                ? ` (${repository.owner.company})`
                : ''}{' '}
              - {repository.owner.email}
            </span>
            <span className='px-2'>
              <StatusBadge status={'private'} label={'Private'} />
            </span>
          </div>
          <DisplayTitle>{repository.name}</DisplayTitle>
          <p
            className={`
              max-w-lg text-xs text-gray-400
              lg:text-sm
            `}
          >
            {repository.description}
          </p>
          {/* Display tags if they exist */}
          {repository.tags && repository.tags.length > 0 && (
            <div className='flex flex-wrap items-center gap-2'>
              <WorkspaceTagDisplay
                tags={repository.tags}
                maxVisible={3}
                size='sm'
              />
            </div>
          )}
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
          <AssetSharePopover
            resourceType='repository'
            resourceId={repository.id}
            resourceLabel={repository.name}
          />
          <Popover
            open={zipSharePopoverOpen}
            onOpenChange={setZipSharePopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button
                size='sm'
                variant='secondary'
                className='w-full'
                icon={<TbLink />}
              >
                {dict.repository.shareZipLink}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-72' align='start'>
              <div className='space-y-3'>
                <p className='text-sm font-medium'>
                  {dict.repository.objects.shareLinkExpiryLabel}
                </p>
                <RadioGroup
                  value={zipShareExpiry}
                  onValueChange={setZipShareExpiry}
                >
                  {Object.entries(
                    dict.repository.objects.shareLinkExpiryOptions
                  ).map(([value, label]) => (
                    <div key={value} className='flex items-center gap-2'>
                      <RadioGroupItem
                        value={value}
                        id={`zip-share-expiry-${value}`}
                      />
                      <Label htmlFor={`zip-share-expiry-${value}`}>
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {zipShareExpiry === 'custom' && (
                  <div className='flex items-center gap-2'>
                    <Input
                      type='number'
                      min={1}
                      value={zipCustomHours}
                      onChange={(e) => setZipCustomHours(e.target.value)}
                      className='h-8'
                    />
                    <span className='text-sm text-muted-foreground'>
                      {dict.repository.objects.shareLinkCustomHours}
                    </span>
                  </div>
                )}
                <Button
                  size='sm'
                  className='w-full'
                  onClick={handleShareZip}
                  loading={generatingZipLink}
                >
                  {dict.repository.objects.shareLinkGenerate}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <TabsWithBackButton
        onBackClick={() => {
          router.push(repositoriesListUrl);
        }}
        backTooltip={dict.common.back}
        tabs={tabs}
        moreTabs={moreTabs}
        moreLabel={dict.common.more}
      />
    </div>
  );
}
