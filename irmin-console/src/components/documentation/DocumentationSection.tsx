'use client';

import { useCallback, useMemo, useState } from 'react';

import Link from 'next/link';

import { BsFilePdf, BsPerson, BsSearch, BsTag } from 'react-icons/bs';
import { GoWorkflow } from 'react-icons/go';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { TbClipboardX, TbCode, TbDatabase, TbRun, TbSql } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import DisplayTitle from '@/components/ui/display-title';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import { Input } from '@/components/ui/input';
import DocumentationSkeleton from '@/components/ui/loading/DocumentationSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import {
  useConnections,
  useRepositories,
  useStoredQueries,
  useWorkflows,
} from '@/hooks/api';
import { useScripts } from '@/hooks/api/useScripts';

import MDXViewer from './MDXViewer';
import RepositoryDocumentationCard from './RepositoryDocumentationCard';
import { downloadDocumentationPDF } from './usePDFExport';
import { ownerSummary, renderTags } from './utils';

function renderDocumentation(content: string | undefined, heading: string) {
  if (!content || content.length === 0) return null;
  return (
    <div className='mt-4 space-y-4 border-t pt-4'>
      <h4 className='text-sm text-muted-foreground'>{heading}</h4>
      <MDXViewer content={content} />
    </div>
  );
}

interface SearchableEntityOwner {
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
}

type SearchableEntity = {
  name?: string;
  description?: string;
  owner?: SearchableEntityOwner;
  tags?: unknown[];
  documentation?: string;
  status?: string;
  type?: string;
  workflowType?: string;
  connector?: unknown;
};

function matchSearch<T extends SearchableEntity>(items: T[], term: string) {
  const trimmed = term.trim();
  if (!trimmed) return items;
  const lowered = trimmed.toLowerCase();
  return items.filter((item) => {
    const matchesName = item.name?.toLowerCase().includes(lowered);
    const matchesDescription = item.description
      ?.toLowerCase()
      .includes(lowered);
    const matchesOwner =
      item.owner?.first_name?.toLowerCase().includes(lowered) ||
      item.owner?.last_name?.toLowerCase().includes(lowered) ||
      item.owner?.company?.toLowerCase().includes(lowered) ||
      item.owner?.email?.toLowerCase().includes(lowered);
    const matchesDocumentation = item.documentation
      ?.toLowerCase()
      .includes(lowered);
    const matchesTags = Array.isArray(item.tags)
      ? item.tags.some((tag) => {
          if (typeof tag === 'string') {
            return tag.toLowerCase().includes(lowered);
          }
          if (tag && typeof tag === 'object' && 'name' in tag) {
            const value = (tag as { name?: string }).name;
            return typeof value === 'string'
              ? value.toLowerCase().includes(lowered)
              : false;
          }
          return false;
        })
      : false;

    const connectorName =
      typeof item.connector === 'string'
        ? item.connector
        : item.connector && typeof item.connector === 'object'
          ? ((item.connector as { name?: string }).name ?? '')
          : '';
    const matchesConnector = connectorName.toLowerCase().includes(lowered);

    const matchesStatus =
      typeof item.status === 'string' &&
      item.status.toLowerCase().includes(lowered);
    const matchesType =
      typeof item.type === 'string' &&
      item.type.toLowerCase().includes(lowered);
    const matchesWorkflowType =
      typeof item.workflowType === 'string' &&
      item.workflowType.toLowerCase().includes(lowered);

    return Boolean(
      matchesName ||
      matchesDescription ||
      matchesOwner ||
      matchesDocumentation ||
      matchesTags ||
      matchesConnector ||
      matchesStatus ||
      matchesType ||
      matchesWorkflowType
    );
  });
}

export default function DocumentationSection() {
  const { connectionsQuery } = useConnections();
  const { workflowsQuery } = useWorkflows();
  const { repositoriesQuery } = useRepositories();
  const { scriptsQuery } = useScripts();
  const { storedQueriesQuery } = useStoredQueries();
  const { workspaceSlug, workspaceQuery } = useWorkspaceContext();
  const { profile } = useIAM();
  const { dict, locale } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');

  const workspace = workspaceQuery.data?.data;
  const repositories = useMemo(
    () => repositoriesQuery.data?.data ?? [],
    [repositoriesQuery.data?.data]
  );
  const connections = useMemo(
    () => connectionsQuery.data?.data ?? [],
    [connectionsQuery.data?.data]
  );
  const workflows = useMemo(
    () => workflowsQuery.data?.data ?? [],
    [workflowsQuery.data?.data]
  );
  const scripts = useMemo(
    () => scriptsQuery.data?.data ?? [],
    [scriptsQuery.data?.data]
  );
  const queries = useMemo(
    () => storedQueriesQuery.data?.data ?? [],
    [storedQueriesQuery.data?.data]
  );

  const connectionById = useMemo(() => {
    return new Map(
      connections.map((connection) => [connection.id, connection])
    );
  }, [connections]);

  const repositoryBySlug = useMemo(() => {
    return new Map(
      repositories.map((repository) => [repository.slug, repository])
    );
  }, [repositories]);

  const repositoryWorkflows = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string }[]>();
    for (const workflow of workflows) {
      if (
        (workflow.type === 'import' || workflow.type === 'export') &&
        workflow.workflowable?.repository
      ) {
        const slug = workflow.workflowable.repository;
        const list = map.get(slug) ?? [];
        list.push({
          id: workflow.id.toString(),
          name: workflow.name,
          type: workflow.type,
        });
        map.set(slug, list);
      }
    }
    return map;
  }, [workflows]);

  const stats = useMemo(
    () => ({
      repositories: repositories.length,
      connections: connections.length,
      workflows: workflows.length,
      scripts: scripts.length,
      queries: queries.length,
      importWorkflows: workflows.filter((w) => w.type === 'import').length,
      exportWorkflows: workflows.filter((w) => w.type === 'export').length,
      actionWorkflows: workflows.filter((w) => w.type === 'action').length,
      pipelineWorkflows: workflows.filter((w) => w.type === 'pipeline').length,
    }),
    [repositories, connections, workflows, scripts, queries]
  );

  const handleDownloadPDF = useCallback(async () => {
    if (!workspace) return;
    try {
      await downloadDocumentationPDF({
        filename: `${workspaceSlug}-documentation-${new Date().toISOString()}.pdf`,
        workspace: { name: workspace.name, slug: workspace.slug },
        profile: profile ?? null,
        locale: locale ?? 'en',
        stats,
        repositories,
        connections,
        workflows,
        scripts,
        queries,
        repositoryWorkflows,
        baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  }, [
    workspace,
    workspaceSlug,
    profile,
    locale,
    stats,
    repositories,
    connections,
    workflows,
    scripts,
    queries,
    repositoryWorkflows,
  ]);

  if (
    workspaceQuery.isLoading ||
    connectionsQuery.isLoading ||
    workflowsQuery.isLoading ||
    repositoriesQuery.isLoading ||
    scriptsQuery.isLoading ||
    storedQueriesQuery.isLoading
  ) {
    return <DocumentationSkeleton />;
  }

  const errors = [
    workspaceQuery.error,
    connectionsQuery.error,
    workflowsQuery.error,
    repositoriesQuery.error,
    scriptsQuery.error,
    storedQueriesQuery.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return (
      <div className='min-h-screen bg-background'>
        <div className='container mx-auto max-w-6xl px-4 py-10'>
          <QueryError
            error={errors[0]}
            onRetry={() => {
              if (workspaceQuery.error) workspaceQuery.refetch();
              if (connectionsQuery.error) connectionsQuery.refetch();
              if (workflowsQuery.error) workflowsQuery.refetch();
              if (repositoriesQuery.error) repositoriesQuery.refetch();
              if (scriptsQuery.error) scriptsQuery.refetch();
              if (storedQueriesQuery.error) storedQueriesQuery.refetch();
            }}
            title={dict.common.errors.failedToLoadDocumentation}
            description={dict.common.errors.failedToLoadAgain}
          />
        </div>
      </div>
    );
  }

  const filteredRepositories = matchSearch(repositories, searchTerm);
  const filteredConnections = matchSearch(connections, searchTerm);
  const filteredWorkflows = matchSearch(workflows, searchTerm);
  const filteredScripts = matchSearch(scripts, searchTerm);
  const filteredQueries = matchSearch(queries, searchTerm);

  if (!workspace) return null;

  const isWorkspaceEmpty =
    repositories.length === 0 &&
    connections.length === 0 &&
    workflows.length === 0 &&
    scripts.length === 0 &&
    queries.length === 0;

  if (isWorkspaceEmpty) {
    return (
      <div className='min-h-screen bg-background'>
        <div className='container mx-auto max-w-6xl px-4 py-12'>
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-muted p-2'>
                <HiOutlineDocumentText className='size-6 text-muted-foreground' />
              </div>
              <Badge variant='secondary'>{dict.catalog.workspace}</Badge>
            </div>
            <DisplayTitle className='text-4xl text-foreground'>
              {workspace.name ?? dict.catalog.workspaceDocumentation}
            </DisplayTitle>
            <p className='max-w-2xl text-base text-muted-foreground'>
              {workspace.description || dict.catalog.workspaceEmptyDescription}
            </p>
            <EmptyState
              icon={<TbClipboardX className='size-full' />}
              title={dict.catalog.workspaceEmptyTitle}
              description={dict.catalog.workspaceEmptyDescription}
              size='lg'
              action={{
                label: dict.catalog.goToWorkspace,
                href: `/${locale}/workspace/${workspaceSlug}`,
                variant: 'default',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background text-foreground'>
      <div className='container mx-auto max-w-6xl px-4 py-12'>
        <div className='mb-10 flex flex-col gap-6'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-muted p-2'>
              <HiOutlineDocumentText className='size-6 text-muted-foreground' />
            </div>
            <Badge variant='secondary'>{dict.catalog.workspace}</Badge>
          </div>
          <DisplayTitle className='text-4xl'>
            {workspace.name ?? dict.catalog.workspaceDocumentation}
          </DisplayTitle>
          {workspace.description && (
            <p className='max-w-2xl text-base text-muted-foreground'>
              {workspace.description}
            </p>
          )}
          <div className='flex flex-wrap items-center gap-4'>
            <Button
              variant='default'
              icon={<BsFilePdf size={18} />}
              onClick={handleDownloadPDF}
            >
              {dict.catalog.downloadPdf}
            </Button>
            <div className='relative'>
              <BsSearch
                className={`
                  pointer-events-none absolute top-1/2 left-3 size-4
                  -translate-y-1/2 text-muted-foreground
                `}
              />
              <Input
                className='w-72 pl-9'
                placeholder={dict.catalog.searchPlaceholder}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className='space-y-12'>
          <section className='space-y-6'>
            <h2 className='text-2xl'>{dict.catalog.summaryTitle}</h2>
            <Card>
              <CardHeader>
                <CardTitle>
                  {workspace.name}{' '}
                  <span className='font-normal text-muted-foreground'>
                    ({workspace.slug})
                  </span>
                </CardTitle>
                <CardDescription>
                  {dict.catalog.summaryDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                {/* Resources */}
                <div>
                  <h4
                    className='
                      mb-3 text-xs font-medium tracking-wider
                      text-muted-foreground uppercase
                    '
                  >
                    {dict.common.resources}
                  </h4>
                  <dl
                    className={`
                      grid grid-cols-2 gap-3 text-sm
                      sm:grid-cols-3
                      lg:grid-cols-5
                    `}
                  >
                    <div className='rounded-md border p-3'>
                      <dd className='text-lg font-semibold tabular-nums'>
                        {stats.repositories}
                      </dd>
                      <dt className='text-xs text-muted-foreground'>
                        {dict.repository.repositories}
                      </dt>
                    </div>
                    <div className='rounded-md border p-3'>
                      <dd className='text-lg font-semibold tabular-nums'>
                        {stats.connections}
                      </dd>
                      <dt className='text-xs text-muted-foreground'>
                        {dict.connections.connections}
                      </dt>
                    </div>
                    <div className='rounded-md border p-3'>
                      <dd className='text-lg font-semibold tabular-nums'>
                        {stats.workflows}
                      </dd>
                      <dt className='text-xs text-muted-foreground'>
                        {dict.workflow.workflows}
                      </dt>
                    </div>
                    <div className='rounded-md border p-3'>
                      <dd className='text-lg font-semibold tabular-nums'>
                        {stats.scripts}
                      </dd>
                      <dt className='text-xs text-muted-foreground'>
                        {dict.consoleNavigation.scripts}
                      </dt>
                    </div>
                    <div className='rounded-md border p-3'>
                      <dd className='text-lg font-semibold tabular-nums'>
                        {stats.queries}
                      </dd>
                      <dt className='text-xs text-muted-foreground'>
                        {dict.query.queries}
                      </dt>
                    </div>
                  </dl>
                </div>
                {/* Workflow breakdown */}
                <div>
                  <h4
                    className='
                      mb-3 text-xs font-medium tracking-wider
                      text-muted-foreground uppercase
                    '
                  >
                    {dict.workflow.workflows}
                  </h4>
                  <dl
                    className={`
                      grid grid-cols-2 gap-3 text-sm
                      sm:grid-cols-4
                    `}
                  >
                    <div className='rounded-md border p-3'>
                      <dd className='text-lg font-semibold tabular-nums'>
                        {stats.importWorkflows}
                      </dd>
                      <dt className='text-xs text-muted-foreground'>
                        {dict.workflow.importWorkflows}
                      </dt>
                    </div>
                    <div className='rounded-md border p-3'>
                      <dd className='text-lg font-semibold tabular-nums'>
                        {stats.exportWorkflows}
                      </dd>
                      <dt className='text-xs text-muted-foreground'>
                        {dict.workflow.exportWorkflows}
                      </dt>
                    </div>
                    <div className='rounded-md border p-3'>
                      <dd className='text-lg font-semibold tabular-nums'>
                        {stats.actionWorkflows}
                      </dd>
                      <dt className='text-xs text-muted-foreground'>
                        {dict.workflow.actionWorkflows}
                      </dt>
                    </div>
                    <div className='rounded-md border p-3'>
                      <dd className='text-lg font-semibold tabular-nums'>
                        {stats.pipelineWorkflows}
                      </dd>
                      <dt className='text-xs text-muted-foreground'>
                        {dict.workflow.pipelineWorkflows}
                      </dt>
                    </div>
                  </dl>
                </div>
              </CardContent>
            </Card>
          </section>

          {repositories.length > 0 && (
            <section className='space-y-6'>
              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-muted p-2'>
                  <TbDatabase className='size-5 text-muted-foreground' />
                </div>
                <div>
                  <h2 className='text-2xl'>{dict.repository.repositories}</h2>
                  <p className='text-sm text-muted-foreground'>
                    {dict.catalog.repositorySectionDescription}
                  </p>
                </div>
              </div>

              {filteredRepositories.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.catalog.repositorySearchEmptyTitle}
                  description={dict.catalog.repositorySearchEmptyDescription}
                  size='md'
                  action={{
                    label: dict.catalog.clearSearch,
                    onClick: () => setSearchTerm(''),
                    variant: 'outline',
                  }}
                />
              ) : (
                <div
                  className={`
                    grid grid-cols-1 gap-6
                    lg:grid-cols-2
                  `}
                >
                  {filteredRepositories.map((repository) => (
                    <RepositoryDocumentationCard
                      key={`repository-${repository.id}`}
                      repository={repository}
                      showNotes={true}
                      relatedWorkflows={repositoryWorkflows.get(
                        repository.slug
                      )}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {connections.length > 0 && (
            <section className='space-y-6'>
              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-muted p-2'>
                  <GoWorkflow className='size-5 text-muted-foreground' />
                </div>
                <div>
                  <h2 className='text-2xl'>{dict.connections.connections}</h2>
                  <p className='text-sm text-muted-foreground'>
                    {dict.catalog.connectionSectionDescription}
                  </p>
                </div>
              </div>

              {filteredConnections.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.catalog.connectionSearchEmptyTitle}
                  description={dict.catalog.connectionSearchEmptyDescription}
                  size='md'
                  action={{
                    label: dict.catalog.clearSearch,
                    onClick: () => setSearchTerm(''),
                    variant: 'outline',
                  }}
                />
              ) : (
                <div
                  className={`
                    grid grid-cols-1 gap-6
                    lg:grid-cols-2
                  `}
                >
                  {filteredConnections.map((connection) => {
                    const owner = ownerSummary(connection.owner);
                    const connectionTags = renderTags(connection.tags);
                    const connectionNotes = renderDocumentation(
                      connection.documentation,
                      dict.catalog.notesHeading
                    );
                    return (
                      <Card key={`connection-${connection.id}`}>
                        <CardHeader>
                          <CardTitle>
                            <Link
                              href={`/${locale}/workspace/${workspaceSlug}/connections/${connection.id}`}
                              className='hover:underline'
                            >
                              {connection.name}
                            </Link>
                          </CardTitle>
                          {connection.description && (
                            <CardDescription>
                              {connection.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <dl className='space-y-3 text-sm'>
                            <div className='flex flex-col gap-1'>
                              <dt className={`text-muted-foreground`}>
                                {dict.connectors.connector}
                              </dt>
                              <dd>
                                <Badge variant='outline'>
                                  {connection.connector.name}
                                </Badge>
                              </dd>
                            </div>
                            {owner && (
                              <div className='flex flex-col gap-1'>
                                <dt
                                  className={`
                                    flex items-center gap-2
                                    text-muted-foreground
                                  `}
                                >
                                  <BsPerson className='size-4' />
                                  {dict.common.owner}
                                </dt>
                                <dd className='text-foreground'>
                                  {owner.name}
                                  {owner.email ? ` • ${owner.email}` : ''}
                                </dd>
                              </div>
                            )}
                            {connectionTags && (
                              <div className='flex flex-col gap-1'>
                                <dt
                                  className={`
                                    flex items-center gap-2
                                    text-muted-foreground
                                  `}
                                >
                                  <BsTag className='size-4' />
                                  {dict.repository.tags.tags}
                                </dt>
                                <dd className='flex flex-wrap gap-2'>
                                  {connectionTags}
                                </dd>
                              </div>
                            )}
                          </dl>
                          {connectionNotes}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {workflows.length > 0 && (
            <section className='space-y-6'>
              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-muted p-2'>
                  <TbRun className='size-5 text-muted-foreground' />
                </div>
                <div>
                  <h2 className='text-2xl'>{dict.workflow.workflows}</h2>
                  <p className='text-sm text-muted-foreground'>
                    {dict.catalog.workflowSectionDescription}
                  </p>
                </div>
              </div>

              {filteredWorkflows.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.catalog.workflowSearchEmptyTitle}
                  description={dict.catalog.workflowSearchEmptyDescription}
                  size='md'
                  action={{
                    label: dict.catalog.clearSearch,
                    onClick: () => setSearchTerm(''),
                    variant: 'outline',
                  }}
                />
              ) : (
                <div
                  className={`
                    grid grid-cols-1 gap-6
                    lg:grid-cols-2
                  `}
                >
                  {filteredWorkflows.map((workflow) => {
                    const owner = ownerSummary(workflow.owner);
                    const statusLabel =
                      workflow.status && workflow.status.length > 0
                        ? workflow.status
                        : dict.workflow.noStatus;

                    const relatedConnectionId =
                      (workflow.type === 'import' ||
                        workflow.type === 'export') &&
                      workflow.workflowable
                        ? workflow.workflowable.connection_id
                        : null;
                    const relatedRepositorySlug =
                      (workflow.type === 'import' ||
                        workflow.type === 'export') &&
                      workflow.workflowable
                        ? workflow.workflowable.repository
                        : null;

                    const relatedConnection = relatedConnectionId
                      ? connectionById.get(relatedConnectionId)
                      : null;
                    const relatedRepository = relatedRepositorySlug
                      ? repositoryBySlug.get(relatedRepositorySlug)
                      : null;
                    const repositoryOwner = relatedRepository
                      ? ownerSummary(relatedRepository.owner)
                      : null;

                    const scheduled =
                      workflow.schedule?.triggers &&
                      workflow.schedule.triggers.length > 0;
                    const workflowTags = renderTags(workflow.tags);
                    const workflowNotes = renderDocumentation(
                      workflow.documentation,
                      dict.catalog.notesHeading
                    );

                    return (
                      <Card key={`workflow-${workflow.id}`}>
                        <CardHeader>
                          <CardTitle>
                            <Link
                              href={`/${locale}/workspace/${workspaceSlug}/workflows/${workflow.id}`}
                              className='hover:underline'
                            >
                              {workflow.name}
                            </Link>
                          </CardTitle>
                          {workflow.description && (
                            <CardDescription>
                              {workflow.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <dl className='space-y-3 text-sm'>
                            <div className='flex flex-col gap-1'>
                              <dt className={`text-muted-foreground`}>
                                {dict.repository.objects.type}
                              </dt>
                              <dd className='capitalize'>{workflow.type}</dd>
                            </div>
                            <div className='flex flex-col gap-1'>
                              <dt className={`text-muted-foreground`}>
                                {dict.list.status}
                              </dt>
                              <dd>
                                <StatusBadge
                                  status={
                                    workflow.status &&
                                    workflow.status.length > 0
                                      ? workflow.status
                                      : 'default'
                                  }
                                  label={statusLabel}
                                />
                              </dd>
                            </div>
                            {owner && (
                              <div className='flex flex-col gap-1'>
                                <dt
                                  className={`
                                    flex items-center gap-2 text-sm
                                    text-muted-foreground
                                  `}
                                >
                                  <BsPerson className='size-4' />
                                  {dict.common.owner}
                                </dt>
                                <dd className={`font-medium text-foreground`}>
                                  {owner.name}
                                  {owner.email ? ` • ${owner.email}` : ''}
                                </dd>
                              </div>
                            )}
                            <div className='flex flex-col gap-1'>
                              <dt className={`text-muted-foreground`}>
                                {dict.catalog.scheduleLabel}
                              </dt>
                              <dd>
                                {scheduled
                                  ? dict.workflow.scheduled
                                  : dict.workflow.notScheduled}
                              </dd>
                            </div>
                            {relatedConnection && (
                              <div className='flex flex-col gap-1'>
                                <dt className={`text-muted-foreground`}>
                                  {dict.connections.connection}
                                </dt>
                                <dd
                                  className={`flex flex-wrap items-center gap-2`}
                                >
                                  <Badge variant='outline'>
                                    {relatedConnection.name}
                                  </Badge>
                                  <span
                                    className={`text-xs text-muted-foreground`}
                                  >
                                    {dict.connectors.connector}:{' '}
                                    {relatedConnection.connector.name}
                                  </span>
                                </dd>
                              </div>
                            )}
                            {relatedRepository && (
                              <div className='flex flex-col gap-1'>
                                <dt className={`text-muted-foreground`}>
                                  {dict.repository.repository}
                                </dt>
                                <dd
                                  className={`flex flex-wrap items-center gap-2`}
                                >
                                  <Badge variant='outline'>
                                    {relatedRepository.name}
                                  </Badge>
                                  {repositoryOwner && (
                                    <span
                                      className={`text-xs text-muted-foreground`}
                                    >
                                      {dict.common.owner}:{' '}
                                      {repositoryOwner.name}
                                    </span>
                                  )}
                                </dd>
                              </div>
                            )}
                            {workflowTags && (
                              <div className='flex flex-col gap-1'>
                                <dt
                                  className={`
                                    flex items-center gap-2
                                    text-muted-foreground
                                  `}
                                >
                                  <BsTag className='size-4' />
                                  {dict.repository.tags.tags}
                                </dt>
                                <dd className='flex flex-wrap gap-2'>
                                  {workflowTags}
                                </dd>
                              </div>
                            )}
                          </dl>
                          {workflowNotes}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {scripts.length > 0 && (
            <section className='space-y-6'>
              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-muted p-2'>
                  <TbCode className='size-5 text-muted-foreground' />
                </div>
                <div>
                  <h2 className='text-2xl'>{dict.consoleNavigation.scripts}</h2>
                  <p className='text-sm text-muted-foreground'>
                    {dict.catalog.scriptSectionDescription}
                  </p>
                </div>
              </div>

              {filteredScripts.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.catalog.scriptSearchEmptyTitle}
                  description={dict.catalog.scriptSearchEmptyDescription}
                  size='md'
                  action={{
                    label: dict.catalog.clearSearch,
                    onClick: () => setSearchTerm(''),
                    variant: 'outline',
                  }}
                />
              ) : (
                <div
                  className={`
                    grid grid-cols-1 gap-6
                    lg:grid-cols-2
                  `}
                >
                  {filteredScripts.map((script) => {
                    const owner = ownerSummary(script.owner);
                    const scriptTags = renderTags(script.tags);
                    return (
                      <Card key={`script-${script.id}`}>
                        <CardHeader>
                          <CardTitle>
                            <Link
                              href={`/${locale}/workspace/${workspaceSlug}/scripts/${script.id}`}
                              className='hover:underline'
                            >
                              {script.name}
                            </Link>
                          </CardTitle>
                          {script.description && (
                            <CardDescription>
                              {script.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <dl className='space-y-3 text-sm'>
                            <div className='flex flex-col gap-1'>
                              <dt className={`text-muted-foreground`}>
                                {dict.repository.objects.type}
                              </dt>
                              <dd className='capitalize'>{script.language}</dd>
                            </div>
                            {owner && (
                              <div className='flex flex-col gap-1'>
                                <dt
                                  className={`
                                    flex items-center gap-2 text-sm
                                    text-muted-foreground
                                  `}
                                >
                                  <BsPerson className='size-4' />
                                  {dict.common.owner}
                                </dt>
                                <dd className={`font-medium text-foreground`}>
                                  {owner.name}
                                  {owner.email ? ` • ${owner.email}` : ''}
                                </dd>
                              </div>
                            )}
                            {scriptTags && (
                              <div className='flex flex-col gap-1'>
                                <dt
                                  className={`
                                    flex items-center gap-2
                                    text-muted-foreground
                                  `}
                                >
                                  <BsTag className='size-4' />
                                  {dict.repository.tags.tags}
                                </dt>
                                <dd className='flex flex-wrap gap-2'>
                                  {scriptTags}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {queries.length > 0 && (
            <section className='space-y-6'>
              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-muted p-2'>
                  <TbSql className='size-5 text-muted-foreground' />
                </div>
                <div>
                  <h2 className='text-2xl'>{dict.query.queries}</h2>
                  <p className='text-sm text-muted-foreground'>
                    {dict.catalog.querySectionDescription}
                  </p>
                </div>
              </div>

              {filteredQueries.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.catalog.querySearchEmptyTitle}
                  description={dict.catalog.querySearchEmptyDescription}
                  size='md'
                  action={{
                    label: dict.catalog.clearSearch,
                    onClick: () => setSearchTerm(''),
                    variant: 'outline',
                  }}
                />
              ) : (
                <div
                  className={`
                    grid grid-cols-1 gap-6
                    lg:grid-cols-2
                  `}
                >
                  {filteredQueries.map((query) => {
                    const owner = ownerSummary(query.owner);
                    const queryTags = renderTags(query.tags);
                    return (
                      <Card key={`query-${query.id}`}>
                        <CardHeader>
                          <CardTitle>
                            <Link
                              href={`/${locale}/workspace/${workspaceSlug}/queries/${query.id}`}
                              className='hover:underline'
                            >
                              {query.name}
                            </Link>
                          </CardTitle>
                          {query.description && (
                            <CardDescription>
                              {query.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <dl className='space-y-3 text-sm'>
                            {owner && (
                              <div className='flex flex-col gap-1'>
                                <dt
                                  className={`
                                    flex items-center gap-2 text-sm
                                    text-muted-foreground
                                  `}
                                >
                                  <BsPerson className='size-4' />
                                  {dict.common.owner}
                                </dt>
                                <dd className={`font-medium text-foreground`}>
                                  {owner.name}
                                  {owner.email ? ` • ${owner.email}` : ''}
                                </dd>
                              </div>
                            )}
                            {queryTags && (
                              <div className='flex flex-col gap-1'>
                                <dt
                                  className={`
                                    flex items-center gap-2
                                    text-muted-foreground
                                  `}
                                >
                                  <BsTag className='size-4' />
                                  {dict.repository.tags.tags}
                                </dt>
                                <dd className='flex flex-wrap gap-2'>
                                  {queryTags}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
