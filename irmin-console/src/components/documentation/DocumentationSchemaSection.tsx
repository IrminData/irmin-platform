'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { BsLayers, BsPerson, BsSearch } from 'react-icons/bs';
import { GoWorkflow } from 'react-icons/go';
import { TbClipboardX, TbDatabase } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import { Input } from '@/components/ui/input';
import SchemaSkeleton from '@/components/ui/loading/SchemaSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useConnections, useRepositories, useWorkflows } from '@/hooks/api';

import type { WorkflowStatus } from '@/types/core/Workflow';

import RepositoryDocumentationCard from './RepositoryDocumentationCard';

type FlowNodeType = 'connector' | 'connection' | 'workflow' | 'repository';

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
  const { repositoriesQuery } = useRepositories();
  const { workflowsQuery } = useWorkflows();
  const { connectionsQuery } = useConnections();

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
    connectionUsage,
    repositoryUsage,
  }: {
    workflowPaths: WorkflowPath[];
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
    return {
      workflowPaths: paths,
      connectionUsage: connectionUsageMap,
      repositoryUsage: repositoryUsageMap,
    };
  }, [workflows, connectionById, repositoryBySlug, locale, workspaceSlug]);

  if (
    repositoriesQuery.isLoading ||
    workflowsQuery.isLoading ||
    connectionsQuery.isLoading ||
    workspaceQuery.isLoading
  ) {
    return (
      <SchemaSkeleton
        showHeader={true}
        showStats={false}
        showControls={false}
        showVisualization={false}
      />
    );
  }

  const errors = [
    workspaceQuery.error,
    repositoriesQuery.error,
    workflowsQuery.error,
    connectionsQuery.error,
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
            }}
            title={dict.common.somethingWentWrong}
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

  if (!workspace) return null;

  const isWorkspaceEmpty =
    repositories.length === 0 &&
    connections.length === 0 &&
    workflows.length === 0;

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
                {dict.documentation.schemaTitle}
              </h1>
            </div>
            <EmptyState
              icon={<TbClipboardX className='size-full' />}
              title={dict.documentation.workspaceEmptyTitle}
              description={dict.documentation.workspaceEmptyDescription}
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
            <h1 className='text-3xl'>{dict.documentation.schemaTitle}</h1>
          </div>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            {dict.documentation.schemaIntro}
          </p>
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
              placeholder={dict.documentation.schemaSearchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <section className='mb-12 space-y-6'>
          <h2 className='text-2xl'>{dict.documentation.dataFlowsTitle}</h2>
          {filteredWorkflowPaths.length === 0 ? (
            <EmptyState
              icon={<TbClipboardX className='size-full' />}
              title={dict.documentation.workflowSearchEmptyTitle}
              description={
                dict.documentation.workflowRelationshipsEmptyDescription
              }
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
                          <li key={node.id} className='flex items-center gap-2'>
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
                                className={`rounded-md border px-3 py-1 text-sm`}
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

        <section className='space-y-6'>
          <h2 className='text-2xl'>
            {dict.documentation.componentDirectoryTitle}
          </h2>
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
                    {dict.documentation.directoryRepositoriesEmpty}
                  </p>
                </CardContent>
              </Card>
            ) : (
              repositories.map((repository) => (
                <RepositoryDocumentationCard
                  key={repository.id}
                  repository={repository}
                  workflowUsageCount={repositoryUsage.get(repository.slug) ?? 0}
                />
              ))
            )}

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
                    {dict.documentation.directoryConnectionsEmpty}
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
                            dict.documentation.unknownConnector}
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
                          {dict.documentation.referencedBy} {usage} {usageLabel}
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
  );
}
