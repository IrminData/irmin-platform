'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import Image from 'next/image';

import { usePDF } from 'react-to-pdf';

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

function ownerSummary(owner?: {
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
}) {
  if (!owner) return null;
  const name = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
  const company = owner.company ? ` (${owner.company})` : '';
  return {
    name: `${name}${company}`.trim(),
    email: owner.email ?? '',
  };
}

function renderTags(tags?: unknown[]) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  const tagLabels = tags
    .map((tag) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag === 'object' && 'name' in tag) {
        const value = (tag as { name?: string }).name;
        return typeof value === 'string' ? value : null;
      }
      return null;
    })
    .filter((tag): tag is string => Boolean(tag));

  if (tagLabels.length === 0) return null;

  return (
    <ul className='flex flex-wrap gap-2'>
      {tagLabels.map((tag) => (
        <li key={tag}>
          <Badge variant='outline' className='text-xs'>
            {tag}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

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
  const { toPDF, targetRef } = usePDF({
    filename: `${workspaceSlug}-documentation-${new Date().toISOString()}.pdf`,
    page: { margin: 24 },
  });

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

  const pdfHeaderRef = useRef<HTMLDivElement | null>(null);
  const pdfVariableOverrides = useMemo(
    () =>
      ({
        '--background': '#ffffff',
        '--foreground': '#111827',
        '--muted': '#f3f4f6',
        '--muted-foreground': '#4b5563',
        '--card': '#ffffff',
        '--card-foreground': '#111827',
        '--primary': '#0f172a',
        '--primary-foreground': '#f8fafc',
        '--secondary': '#e5e7eb',
        '--secondary-foreground': '#111827',
        '--accent': '#f1f5f9',
        '--accent-foreground': '#111827',
        '--border': '#e5e7eb',
        '--input': '#e5e7eb',
        '--ring': '#0f172a',
      }) as Record<string, string>,
    []
  );

  const downloadPDF = useCallback(async () => {
    if (!targetRef.current) return;
    const container = targetRef.current;
    pdfHeaderRef.current?.classList.remove('sr-only');
    container.setAttribute('data-pdf-export', 'true');
    const previousVariables = Object.entries(pdfVariableOverrides).map(
      ([property, value]) => {
        const existing = container.style.getPropertyValue(property);
        container.style.setProperty(property, value);
        return [property, existing] as [string, string];
      }
    );
    const previousBackground = container.style.backgroundColor;
    const previousColor = container.style.color;
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#111827';
    try {
      await toPDF({
        overrides: {
          canvas: {
            backgroundColor: '#ffffff',
            logging: false,
          },
        },
      });
    } finally {
      container.removeAttribute('data-pdf-export');
      previousVariables.forEach(([property, value]) => {
        if (value) {
          container.style.setProperty(property, value);
        } else {
          container.style.removeProperty(property);
        }
      });
      if (previousBackground) {
        container.style.backgroundColor = previousBackground;
      } else {
        container.style.removeProperty('background-color');
      }
      if (previousColor) {
        container.style.color = previousColor;
      } else {
        container.style.removeProperty('color');
      }
      pdfHeaderRef.current?.classList.add('sr-only');
    }
  }, [pdfVariableOverrides, toPDF, targetRef]);

  if (
    workspaceQuery.isLoading ||
    connectionsQuery.isLoading ||
    workflowsQuery.isLoading ||
    repositoriesQuery.isLoading ||
    scriptsQuery.isLoading ||
    storedQueriesQuery.isLoading
  ) {
    return (
      <DocumentationSkeleton
        showHero={true}
        showStats={true}
        showControls={false}
        contentSections={3}
      />
    );
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
            title={dict.common.somethingWentWrong}
          />
        </div>
      </div>
    );
  }

  const stats = {
    repositories: repositories.length,
    connections: connections.length,
    workflows: workflows.length,
    scripts: scripts.length,
    queries: queries.length,
    importWorkflows: workflows.filter((w) => w.type === 'import').length,
    exportWorkflows: workflows.filter((w) => w.type === 'export').length,
    actionWorkflows: workflows.filter((w) => w.type === 'action').length,
    pipelineWorkflows: workflows.filter((w) => w.type === 'pipeline').length,
    scheduledWorkflows: workflows.filter(
      (w) => w.schedule?.triggers && w.schedule.triggers.length > 0
    ).length,
  };

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
              <Badge variant='secondary'>{dict.documentation.workspace}</Badge>
            </div>
            <DisplayTitle className='text-4xl text-foreground'>
              {workspace.name ?? dict.documentation.workspaceDocumentation}
            </DisplayTitle>
            <p className='max-w-2xl text-base text-muted-foreground'>
              {workspace.description ||
                dict.documentation.workspaceEmptyDescription}
            </p>
            <EmptyState
              icon={<TbClipboardX className='size-full' />}
              title={dict.documentation.workspaceEmptyTitle}
              description={dict.documentation.workspaceEmptyDescription}
              size='lg'
              action={{
                label: dict.documentation.goToWorkspace,
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
            <Badge variant='secondary'>{dict.documentation.workspace}</Badge>
          </div>
          <DisplayTitle className='text-4xl'>
            {workspace.name ?? dict.documentation.workspaceDocumentation}
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
              onClick={downloadPDF}
            >
              {dict.documentation.downloadPdf}
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
                placeholder={dict.documentation.searchPlaceholder}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div ref={targetRef} className='space-y-12'>
          <div ref={pdfHeaderRef} className='sr-only'>
            <div className='mb-6 flex items-center justify-between'>
              <Image
                src='/irmin-logo.svg'
                alt='Irmin logo'
                width={120}
                height={32}
                className={`
                  block h-8 w-auto
                  dark:hidden
                `}
              />
              <Image
                src='/irmin-logo-light.svg'
                alt='Irmin logo'
                width={120}
                height={32}
                className={`
                  hidden h-8 w-auto
                  dark:block
                `}
              />
            </div>
            <div className='space-y-2 text-sm text-muted-foreground'>
              {profile && (
                <p>
                  <span className=''>{dict.documentation.createdBy}: </span>
                  {`${profile.first_name} ${profile.last_name}`}
                  {profile.company ? ` (${profile.company})` : ''}
                  {profile.email ? ` • ${profile.email}` : ''}
                </p>
              )}
              <p>
                <span className=''>{dict.common.timestamp}: </span>
                {new Date().toLocaleString(locale ?? 'en')}
              </p>
            </div>
          </div>

          <section className='space-y-6'>
            <h2 className='text-2xl'>{dict.documentation.summaryTitle}</h2>
            <Card>
              <CardHeader>
                <CardTitle>{dict.common.overview}</CardTitle>
                <CardDescription>
                  {dict.documentation.summaryDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl
                  className={`
                    grid grid-cols-1 gap-4 text-sm
                    sm:grid-cols-2
                    lg:grid-cols-3
                  `}
                >
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.repository.repositories}
                    </dt>
                    <dd className='text-base font-medium'>
                      {stats.repositories}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.connections.connections}
                    </dt>
                    <dd className='text-base font-medium'>
                      {stats.connections}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.workflow.workflows}
                    </dt>
                    <dd className='text-base font-medium'>{stats.workflows}</dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.consoleNavigation.scripts}
                    </dt>
                    <dd className='text-base font-medium'>{stats.scripts}</dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.query.queries}
                    </dt>
                    <dd className='text-base font-medium'>{stats.queries}</dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.workflow.importWorkflows}
                    </dt>
                    <dd className='text-base font-medium'>
                      {stats.importWorkflows}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.workflow.exportWorkflows}
                    </dt>
                    <dd className='text-base font-medium'>
                      {stats.exportWorkflows}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.workflow.actionWorkflows}
                    </dt>
                    <dd className='text-base font-medium'>
                      {stats.actionWorkflows}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.workflow.pipelineWorkflows}
                    </dt>
                    <dd className='text-base font-medium'>
                      {stats.pipelineWorkflows}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.workflow.scheduledWorkflows}
                    </dt>
                    <dd className='text-base font-medium'>
                      {stats.scheduledWorkflows}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>
                      {dict.documentation.workspaceIdentifier}
                    </dt>
                    <dd className='text-base font-medium'>
                      {workspace.name} ({workspace.slug})
                    </dd>
                  </div>
                </dl>
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
                    {dict.documentation.repositorySectionDescription}
                  </p>
                </div>
              </div>

              {filteredRepositories.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.documentation.repositorySearchEmptyTitle}
                  description={
                    dict.documentation.repositorySearchEmptyDescription
                  }
                  size='md'
                  action={{
                    label: dict.documentation.clearSearch,
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
                  {filteredRepositories.map((repository) => {
                    const owner = ownerSummary(repository.owner);
                    const repositoryTags = renderTags(repository.tags);
                    const repositoryNotes = renderDocumentation(
                      repository.documentation,
                      dict.documentation.notesHeading
                    );
                    return (
                      <Card key={`repository-${repository.id}`}>
                        <CardHeader>
                          <CardTitle>{repository.name}</CardTitle>
                          {repository.description && (
                            <CardDescription>
                              {repository.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <dl className='space-y-3 text-sm'>
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
                            <div className='flex flex-col gap-1'>
                              <dt className={`text-muted-foreground`}>
                                {dict.documentation.visibilityLabel}
                              </dt>
                              <dd>
                                <StatusBadge
                                  status='private'
                                  label={dict.documentation.visibilityPrivate}
                                />
                              </dd>
                            </div>
                            {repositoryTags && (
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
                                <dd>{repositoryTags}</dd>
                              </div>
                            )}
                          </dl>
                          {repositoryNotes}
                        </CardContent>
                      </Card>
                    );
                  })}
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
                    {dict.documentation.connectionSectionDescription}
                  </p>
                </div>
              </div>

              {filteredConnections.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.documentation.connectionSearchEmptyTitle}
                  description={
                    dict.documentation.connectionSearchEmptyDescription
                  }
                  size='md'
                  action={{
                    label: dict.documentation.clearSearch,
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
                      dict.documentation.notesHeading
                    );
                    return (
                      <Card key={`connection-${connection.id}`}>
                        <CardHeader>
                          <CardTitle>{connection.name}</CardTitle>
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
                                <dd>{connectionTags}</dd>
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
                    {dict.documentation.workflowSectionDescription}
                  </p>
                </div>
              </div>

              {filteredWorkflows.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.documentation.workflowSearchEmptyTitle}
                  description={
                    dict.documentation.workflowSearchEmptyDescription
                  }
                  size='md'
                  action={{
                    label: dict.documentation.clearSearch,
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
                      dict.documentation.notesHeading
                    );

                    return (
                      <Card key={`workflow-${workflow.id}`}>
                        <CardHeader>
                          <CardTitle>{workflow.name}</CardTitle>
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
                                {dict.documentation.scheduleLabel}
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
                                <dd>{workflowTags}</dd>
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
                    {dict.documentation.scriptSectionDescription}
                  </p>
                </div>
              </div>

              {filteredScripts.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.documentation.scriptSearchEmptyTitle}
                  description={dict.documentation.scriptSearchEmptyDescription}
                  size='md'
                  action={{
                    label: dict.documentation.clearSearch,
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
                          <CardTitle>{script.name}</CardTitle>
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
                                <dd>{scriptTags}</dd>
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
                    {dict.documentation.querySectionDescription}
                  </p>
                </div>
              </div>

              {filteredQueries.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.documentation.querySearchEmptyTitle}
                  description={dict.documentation.querySearchEmptyDescription}
                  size='md'
                  action={{
                    label: dict.documentation.clearSearch,
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
                          <CardTitle>{query.name}</CardTitle>
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
                                <dd>{queryTags}</dd>
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
