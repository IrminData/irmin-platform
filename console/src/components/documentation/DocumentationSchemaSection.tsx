'use client';

import { useCallback, useMemo, useState } from 'react';

import Link from 'next/link';

import { BsFilePdf, BsLayers, BsPerson, BsSearch } from 'react-icons/bs';
import { GoWorkflow } from 'react-icons/go';
import { TbClipboardX, TbDatabase, TbSparkles } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import { Input } from '@/components/ui/input';
import SchemaSkeleton from '@/components/ui/loading/SchemaSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import {
  useAIApplications,
  useConnections,
  useRepositories,
  useWorkflows,
} from '@/hooks/api';

import type { AIApplication } from '@/types/core/AIApplication';
import type { WorkflowStatus } from '@/types/core/Workflow';

import RepositoryDocumentationCard from './RepositoryDocumentationCard';
import { downloadSchemaPDF } from './usePDFExport';

type FlowNodeType =
  'connector' | 'connection' | 'workflow' | 'repository' | 'ai_application';

type FlowNode = {
  id: string;
  label: string;
  type: FlowNodeType;
  subLabel?: string;
  href?: string;
};

type WorkflowPath = {
  id: string;
  name: string;
  description?: string;
  status?: WorkflowStatus;
  type: string;
  owner?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    email?: string;
  };
  nodes: FlowNode[];
  tags?: unknown[];
};

type AIApplicationPath = {
  id: string;
  name: string;
  description?: string;
  owner?: WorkflowPath['owner'];
  repositoryNodes: FlowNode[];
  applicationNode: FlowNode;
  tags?: unknown[];
  writeEnabled: boolean;
};

function ownerLabel(owner?: WorkflowPath['owner']) {
  if (!owner) return null;
  const name = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
  const company = owner.company ? ` (${owner.company})` : '';
  const email = owner.email ? ` • ${owner.email}` : '';
  return `${name}${company}${email}`.trim();
}

function tagBadges(tags?: unknown[]) {
  if (!Array.isArray(tags) || tags.length === 0) return null;

  const values = tags
    .map((tag) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag === 'object' && 'name' in tag) {
        const value = (tag as { name?: string }).name;
        return typeof value === 'string' ? value : null;
      }
      return null;
    })
    .filter((tag): tag is string => Boolean(tag));

  if (values.length === 0) return null;

  return (
    <ul className='flex flex-wrap gap-2'>
      {values.map((tag) => (
        <li key={tag}>
          <Badge variant='outline' className='text-xs'>
            {tag}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function matchSearch(term: string, value: string | undefined) {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return value?.toLowerCase().includes(query);
}

export default function DocumentationSchemaSection() {
  const { locale, dict } = useLocale();
  const { workspaceSlug, workspaceQuery } = useWorkspaceContext();
  const { profile } = useIAM();
  const { repositoriesQuery } = useRepositories();
  const { workflowsQuery } = useWorkflows();
  const { connectionsQuery } = useConnections();
  const { aiApplicationsQuery } = useAIApplications();

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
  const aiApplications = useMemo(
    () => aiApplicationsQuery.data?.data ?? [],
    [aiApplicationsQuery.data?.data]
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

  const {
    workflowPaths,
    aiApplicationPaths,
    connectionUsage,
    repositoryUsage,
  }: {
    workflowPaths: WorkflowPath[];
    aiApplicationPaths: AIApplicationPath[];
    connectionUsage: Map<string, number>;
    repositoryUsage: Map<string, number>;
  } = useMemo(() => {
    const connectionUsageMap = new Map<string, number>();
    const repositoryUsageMap = new Map<string, number>();

    const paths = workflows.map((workflow) => {
      const nodes: FlowNode[] = [];

      if (
        (workflow.type === 'import' || workflow.type === 'export') &&
        workflow.workflowable
      ) {
        const connectionId = workflow.workflowable.connection_id;
        const repositorySlug = workflow.workflowable.repository;
        const connection = connectionById.get(connectionId);
        const repository = repositoryBySlug.get(repositorySlug);

        if (workflow.type === 'import') {
          if (connection) {
            const connectorLabel = connection.connector?.name ?? 'Connector';
            nodes.push({
              id: `connector-${connectionId}`,
              label: connectorLabel,
              type: 'connector',
            });
            nodes.push({
              id: `connection-${connectionId}`,
              label: connection.name,
              type: 'connection',
              href: `/${locale}/workspace/${workspaceSlug}/connections/${connection.id}`,
              subLabel: connectorLabel,
            });
            connectionUsageMap.set(
              connection.id,
              (connectionUsageMap.get(connection.id) ?? 0) + 1
            );
          }
          nodes.push({
            id: `workflow-${workflow.id}`,
            label: workflow.name,
            type: 'workflow',
            href: `/${locale}/workspace/${workspaceSlug}/workflows/${workflow.id}`,
          });
          if (repository) {
            nodes.push({
              id: `repository-${repository.slug}`,
              label: repository.name,
              type: 'repository',
              href: `/${locale}/workspace/${workspaceSlug}/repositories/${repository.slug}`,
            });
            repositoryUsageMap.set(
              repository.slug,
              (repositoryUsageMap.get(repository.slug) ?? 0) + 1
            );
          }
        } else {
          if (repository) {
            nodes.push({
              id: `repository-${repository.slug}`,
              label: repository.name,
              type: 'repository',
              href: `/${locale}/workspace/${workspaceSlug}/repositories/${repository.slug}`,
            });
            repositoryUsageMap.set(
              repository.slug,
              (repositoryUsageMap.get(repository.slug) ?? 0) + 1
            );
          }
          nodes.push({
            id: `workflow-${workflow.id}`,
            label: workflow.name,
            type: 'workflow',
            href: `/${locale}/workspace/${workspaceSlug}/workflows/${workflow.id}`,
          });
          if (connection) {
            const connectorLabel = connection.connector?.name ?? 'Connector';
            nodes.push({
              id: `connection-${connectionId}`,
              label: connection.name,
              type: 'connection',
              href: `/${locale}/workspace/${workspaceSlug}/connections/${connection.id}`,
              subLabel: connectorLabel,
            });
            nodes.push({
              id: `connector-${connectionId}`,
              label: connectorLabel,
              type: 'connector',
            });
            connectionUsageMap.set(
              connection.id,
              (connectionUsageMap.get(connection.id) ?? 0) + 1
            );
          }
        }
      } else {
        nodes.push({
          id: `workflow-${workflow.id}`,
          label: workflow.name,
          type: 'workflow',
          href: `/${locale}/workspace/${workspaceSlug}/workflows/${workflow.id}`,
        });
      }

      return {
        id: workflow.id.toString(),
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        type: workflow.type,
        owner: workflow.owner,
        nodes,
        tags: workflow.tags,
      };
    });
    const appPaths: AIApplicationPath[] = aiApplications.map(
      (app: AIApplication) => {
        const uniqueSlugs = Array.from(
          new Set((app.data_sources ?? []).map((ds) => ds.repository))
        );
        const repositoryNodes: FlowNode[] = uniqueSlugs.map((slug) => {
          const repo = repositoryBySlug.get(slug);
          return {
            id: `ai-app-repo-${app.id}-${slug}`,
            label: repo?.name ?? slug,
            type: 'repository',
            href: `/${locale}/workspace/${workspaceSlug}/repositories/${slug}`,
          };
        });
        const applicationNode: FlowNode = {
          id: `ai-application-${app.id}`,
          label: app.name,
          type: 'ai_application',
          href: `/${locale}/workspace/${workspaceSlug}/ai-applications/${app.id}`,
        };
        return {
          id: app.id,
          name: app.name,
          description: app.description,
          owner: app.owner,
          repositoryNodes,
          applicationNode,
          tags: app.tags,
          writeEnabled: app.tools?.write_enabled ?? false,
        };
      }
    );

    return {
      workflowPaths: paths,
      aiApplicationPaths: appPaths,
      connectionUsage: connectionUsageMap,
      repositoryUsage: repositoryUsageMap,
    };
  }, [
    workflows,
    aiApplications,
    connectionById,
    repositoryBySlug,
    locale,
    workspaceSlug,
  ]);

  const handleDownloadPDF = useCallback(async () => {
    if (!workspace) return;
    try {
      await downloadSchemaPDF({
        filename: `${workspaceSlug}-schema-${new Date().toISOString()}.pdf`,
        workspace: { name: workspace.name, slug: workspace.slug },
        profile: profile ?? null,
        locale: locale ?? 'en',
        workflows,
        connections,
        repositories,
        aiApplications,
        connectionById,
        repositoryBySlug,
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
    workflows,
    connections,
    repositories,
    aiApplications,
    connectionById,
    repositoryBySlug,
  ]);

  if (
    repositoriesQuery.isLoading ||
    workflowsQuery.isLoading ||
    connectionsQuery.isLoading ||
    aiApplicationsQuery.isLoading ||
    workspaceQuery.isLoading
  ) {
    return <SchemaSkeleton />;
  }

  const errors = [
    workspaceQuery.error,
    repositoriesQuery.error,
    workflowsQuery.error,
    connectionsQuery.error,
    aiApplicationsQuery.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return (
      <div className='min-h-screen bg-background'>
        <div className='container mx-auto max-w-6xl px-4 py-12'>
          <QueryError
            error={errors[0]}
            onRetry={() => {
              if (workspaceQuery.error) workspaceQuery.refetch();
              if (repositoriesQuery.error) repositoriesQuery.refetch();
              if (workflowsQuery.error) workflowsQuery.refetch();
              if (connectionsQuery.error) connectionsQuery.refetch();
              if (aiApplicationsQuery.error) aiApplicationsQuery.refetch();
            }}
            title={dict.common.errors.failedToLoadSchema}
            description={dict.common.errors.failedToLoadAgain}
          />
        </div>
      </div>
    );
  }

  const filteredWorkflowPaths = searchTerm
    ? workflowPaths.filter((path) => {
        const owner = ownerLabel(path.owner);
        return (
          matchSearch(searchTerm, path.name) ||
          matchSearch(searchTerm, path.description) ||
          matchSearch(searchTerm, owner ?? '') ||
          path.nodes.some(
            (node) =>
              matchSearch(searchTerm, node.label) ||
              matchSearch(searchTerm, node.subLabel)
          )
        );
      })
    : workflowPaths;

  const filteredAIApplicationPaths = searchTerm
    ? aiApplicationPaths.filter((path) => {
        const owner = ownerLabel(path.owner);
        return (
          matchSearch(searchTerm, path.name) ||
          matchSearch(searchTerm, path.description) ||
          matchSearch(searchTerm, owner ?? '') ||
          path.repositoryNodes.some((node) =>
            matchSearch(searchTerm, node.label)
          )
        );
      })
    : aiApplicationPaths;

  if (!workspace) return null;

  const isWorkspaceEmpty =
    repositories.length === 0 &&
    connections.length === 0 &&
    workflows.length === 0 &&
    aiApplications.length === 0;

  if (isWorkspaceEmpty) {
    return (
      <div className='min-h-screen bg-background'>
        <div className='container mx-auto max-w-6xl px-4 py-12'>
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-muted p-2'>
                <BsLayers className='size-6 text-muted-foreground' />
              </div>
              <h1 className='text-3xl font-semibold text-foreground capitalize'>
                {dict.catalog.schemaTitle}
              </h1>
            </div>
            <EmptyState
              icon={<TbClipboardX className='size-full' />}
              title={dict.catalog.workspaceEmptyTitle}
              description={dict.catalog.workspaceEmptyDescription}
              size='lg'
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
              <BsLayers className='size-6 text-muted-foreground' />
            </div>
            <h1 className='text-3xl'>{dict.catalog.schemaTitle}</h1>
          </div>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            {dict.catalog.schemaIntro}
          </p>
          <div className='flex flex-wrap items-center gap-4'>
            <div
              className={`
                relative w-full
                sm:w-80
              `}
            >
              <BsSearch
                className={`
                  pointer-events-none absolute top-1/2 left-3 size-4
                  -translate-y-1/2 text-muted-foreground
                `}
              />
              <Input
                className='pl-10'
                placeholder={dict.catalog.schemaSearchPlaceholder}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Button
              variant='default'
              icon={<BsFilePdf size={18} />}
              onClick={handleDownloadPDF}
            >
              {dict.catalog.downloadPdf}
            </Button>
          </div>
        </div>

        <div className='space-y-12'>
          <section className='mb-12 space-y-6'>
            <h2 className='text-2xl'>{dict.catalog.dataFlowsTitle}</h2>
            {filteredWorkflowPaths.length === 0 ? (
              <EmptyState
                icon={<TbClipboardX className='size-full' />}
                title={dict.catalog.workflowSearchEmptyTitle}
                description={dict.catalog.workflowRelationshipsEmptyDescription}
                size='md'
              />
            ) : (
              <div className='space-y-6'>
                {filteredWorkflowPaths.map((path) => {
                  const owner = ownerLabel(path.owner);
                  const scheduled =
                    path.status && path.status.length > 0 ? path.status : null;
                  return (
                    <Card key={path.id}>
                      <CardHeader className='space-y-2'>
                        <div className='flex flex-wrap items-center gap-3'>
                          <CardTitle className='text-xl'>
                            <Link
                              href={`/${locale}/workspace/${workspaceSlug}/workflows/${path.id}`}
                              className='hover:underline'
                            >
                              {path.name}
                            </Link>
                          </CardTitle>
                          <Badge variant='outline' className='capitalize'>
                            {path.type}
                          </Badge>
                          {scheduled && (
                            <StatusBadge
                              status={path.status ?? 'default'}
                              label={scheduled}
                            />
                          )}
                        </div>
                        {path.description && (
                          <p className='text-sm text-muted-foreground'>
                            {path.description}
                          </p>
                        )}
                        {owner && (
                          <p
                            className={`
                              flex items-center gap-2 text-xs
                              text-muted-foreground
                            `}
                          >
                            <BsPerson className='size-3' />
                            {owner}
                          </p>
                        )}
                        {tagBadges(path.tags)}
                      </CardHeader>
                      <CardContent>
                        <ul className='flex flex-wrap items-center gap-2 text-sm'>
                          {path.nodes.map((node, index) => (
                            <li
                              key={node.id}
                              className='flex items-center gap-2'
                            >
                              {node.href ? (
                                <Link
                                  href={node.href}
                                  className={`
                                    rounded-md border px-3 py-1 text-sm
                                    transition-colors
                                    hover:bg-muted
                                  `}
                                >
                                  {node.label}
                                  {node.subLabel ? (
                                    <span
                                      className={`
                                        ml-2 text-xs text-muted-foreground
                                      `}
                                    >
                                      {node.subLabel}
                                    </span>
                                  ) : null}
                                </Link>
                              ) : (
                                <span
                                  className={`
                                    rounded-md border px-3 py-1 text-sm
                                  `}
                                >
                                  {node.label}
                                  {node.subLabel ? (
                                    <span
                                      className={`
                                        ml-2 text-xs text-muted-foreground
                                      `}
                                    >
                                      {node.subLabel}
                                    </span>
                                  ) : null}
                                </span>
                              )}
                              {index < path.nodes.length - 1 && (
                                <span className='text-muted-foreground'>→</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {aiApplicationPaths.length > 0 && (
            <section className='mb-12 space-y-6'>
              <h2 className='text-2xl'>
                {dict.catalog.aiApplicationFlowsTitle}
              </h2>
              {filteredAIApplicationPaths.length === 0 ? (
                <EmptyState
                  icon={<TbClipboardX className='size-full' />}
                  title={dict.catalog.aiApplicationSearchEmptyTitle}
                  description={dict.catalog.aiApplicationFlowsEmptyDescription}
                  size='md'
                />
              ) : (
                <div className='space-y-6'>
                  {filteredAIApplicationPaths.map((path) => {
                    const owner = ownerLabel(path.owner);
                    return (
                      <Card key={`ai-app-flow-${path.id}`}>
                        <CardHeader className='space-y-2'>
                          <div className='flex flex-wrap items-center gap-3'>
                            <CardTitle className='text-xl'>
                              <Link
                                href={`/${locale}/workspace/${workspaceSlug}/ai-applications/${path.id}`}
                                className='hover:underline'
                              >
                                {path.name}
                              </Link>
                            </CardTitle>
                            <Badge variant='outline'>
                              {dict.consoleNavigation.aiApplications}
                            </Badge>
                            <StatusBadge
                              status={path.writeEnabled ? 'pending' : 'default'}
                              label={
                                path.writeEnabled
                                  ? dict.catalog.aiApplicationWriteEnabled
                                  : dict.catalog.aiApplicationReadOnly
                              }
                            />
                          </div>
                          {path.description && (
                            <p className='text-sm text-muted-foreground'>
                              {path.description}
                            </p>
                          )}
                          {owner && (
                            <p
                              className={`
                                flex items-center gap-2 text-xs
                                text-muted-foreground
                              `}
                            >
                              <BsPerson aria-hidden='true' className='size-3' />
                              {owner}
                            </p>
                          )}
                          {tagBadges(path.tags)}
                        </CardHeader>
                        <CardContent>
                          {path.repositoryNodes.length === 0 ? (
                            <p className='text-sm text-muted-foreground'>
                              {dict.catalog.aiApplicationNoDataSources}
                            </p>
                          ) : (
                            <ul
                              className={`
                                flex flex-wrap items-center gap-2 text-sm
                              `}
                            >
                              {path.repositoryNodes.map((node, index) => {
                                const nodeClass = `
                                  rounded-md border px-3 py-1 text-sm
                                  transition-[background-color] duration-150
                                  hover:bg-muted
                                `;
                                return (
                                  <li
                                    key={node.id}
                                    className='flex items-center gap-2'
                                  >
                                    {node.href ? (
                                      <Link
                                        href={node.href}
                                        className={nodeClass}
                                      >
                                        {node.label}
                                      </Link>
                                    ) : (
                                      <span className={nodeClass}>
                                        {node.label}
                                      </span>
                                    )}
                                    {index <
                                      path.repositoryNodes.length - 1 && (
                                      <span className='text-muted-foreground'>
                                        ,
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                              <li className='flex items-center gap-2'>
                                <span className='text-muted-foreground'>→</span>
                                {path.applicationNode.href ? (
                                  <Link
                                    href={path.applicationNode.href}
                                    className={`
                                      rounded-md border border-accent/40 px-3
                                      py-1 text-sm text-accent
                                      transition-[background-color,color]
                                      duration-150
                                      hover:bg-accent/10
                                    `}
                                  >
                                    {path.applicationNode.label}
                                  </Link>
                                ) : (
                                  <span
                                    className={`
                                      rounded-md border border-accent/40 px-3
                                      py-1 text-sm text-accent
                                    `}
                                  >
                                    {path.applicationNode.label}
                                  </span>
                                )}
                              </li>
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section className='space-y-6'>
            <h2 className='text-2xl'>{dict.catalog.componentDirectoryTitle}</h2>
            <div
              className={`
                grid grid-cols-1 gap-6
                lg:grid-cols-2
              `}
            >
              {repositories.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-lg'>
                      <TbDatabase className='size-5 text-muted-foreground' />
                      {dict.repository.repositories}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      {dict.catalog.directoryRepositoriesEmpty}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                repositories.map((repository) => (
                  <RepositoryDocumentationCard
                    key={repository.id}
                    repository={repository}
                    workflowUsageCount={
                      repositoryUsage.get(repository.slug) ?? 0
                    }
                  />
                ))
              )}

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-lg'>
                    <TbSparkles
                      aria-hidden='true'
                      className='size-5 text-muted-foreground'
                    />
                    {dict.consoleNavigation.aiApplications}
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 text-sm'>
                  {aiApplications.length === 0 ? (
                    <p className='text-muted-foreground'>
                      {dict.catalog.directoryAIApplicationsEmpty}
                    </p>
                  ) : (
                    aiApplications.map((app) => {
                      const owner = ownerLabel(app.owner);
                      const dsSlugs = Array.from(
                        new Set(
                          (app.data_sources ?? []).map((ds) => ds.repository)
                        )
                      );
                      const count = dsSlugs.length;
                      const countLabel = (
                        count === 1
                          ? dict.repository.repository
                          : dict.repository.repositories
                      ).toLocaleLowerCase(locale);
                      return (
                        <div
                          key={app.id}
                          className={`
                            space-y-1 border-b pb-3
                            last:border-b-0 last:pb-0
                          `}
                        >
                          <Link
                            href={`/${locale}/workspace/${workspaceSlug}/ai-applications/${app.id}`}
                            className={`
                              text-foreground
                              hover:underline
                            `}
                          >
                            {app.name}
                          </Link>
                          {app.description && (
                            <p className='text-xs text-muted-foreground'>
                              {app.description}
                            </p>
                          )}
                          {owner && (
                            <p className='text-xs text-muted-foreground'>
                              {dict.common.owner}: {owner}
                            </p>
                          )}
                          <p className='text-xs text-muted-foreground'>
                            {dict.catalog.consumes} {count} {countLabel}
                          </p>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-lg'>
                    <GoWorkflow className='size-5 text-muted-foreground' />
                    {dict.connections.connections}
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 text-sm'>
                  {connections.length === 0 ? (
                    <p className='text-muted-foreground'>
                      {dict.catalog.directoryConnectionsEmpty}
                    </p>
                  ) : (
                    connections.map((connection) => {
                      const owner = ownerLabel(connection.owner);
                      const usage = connectionUsage.get(connection.id) ?? 0;
                      const usageLabel = (
                        usage === 1
                          ? dict.workflow.workflow
                          : dict.workflow.workflows
                      ).toLocaleLowerCase(locale);
                      return (
                        <div
                          key={connection.id}
                          className={`
                            space-y-1 border-b pb-3
                            last:border-b-0 last:pb-0
                          `}
                        >
                          <Link
                            href={`/${locale}/workspace/${workspaceSlug}/connections/${connection.id}`}
                            className={`
                              text-foreground
                              hover:underline
                            `}
                          >
                            {connection.name}
                          </Link>
                          <p className='text-xs text-muted-foreground'>
                            {dict.connectors.connector}:{' '}
                            {connection.connector?.name ??
                              dict.catalog.unknownConnector}
                          </p>
                          {connection.description && (
                            <p className='text-xs text-muted-foreground'>
                              {connection.description}
                            </p>
                          )}
                          {owner && (
                            <p className='text-xs text-muted-foreground'>
                              {dict.common.owner}: {owner}
                            </p>
                          )}
                          <p className='text-xs text-muted-foreground'>
                            {dict.catalog.referencedBy} {usage} {usageLabel}
                          </p>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
