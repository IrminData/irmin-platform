'use client';

import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import {
  BsArrowRight,
  BsEye,
  BsGear,
  BsLayers,
  BsSearch,
  BsToggleOff,
  BsToggleOn,
} from 'react-icons/bs';
import {
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlineDatabase,
  HiOutlineDocument,
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlineFolder,
  HiOutlinePlay,
  HiOutlineUpload,
} from 'react-icons/hi';
import { TbClipboardX, TbFileX } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import { Input } from '@/components/ui/input';
import SchemaSkeleton from '@/components/ui/loading/SchemaSkeleton';
import StatusBadge from '@/components/ui/StatusBadge';

import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useConnections, useRepositories, useWorkflows } from '@/hooks/api';
import { useWorkspaceSchema } from '@/hooks/api/useWorkspaceSchema';

import type { WorkflowStatus } from '@/types/core/Workflow';

import type { TreeNode } from './TreeChart';

const TreeChart = dynamic(() => import('./TreeChart'), {
  loading: () => <SchemaSkeleton showVisualization={false} />,
});

interface FlowElementMetadata {
  slug?: string;
  totalRepositories?: number;
  totalConnections?: number;
  totalWorkflows?: number;
  private?: boolean;
  tags?: unknown[];
  objects?: unknown[];
  connector?: unknown;
  details?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  type?: string;
  schedule?: unknown;
  fieldMappings?: unknown[];
  [key: string]: unknown;
}

interface FlowElement {
  id: string;
  type:
    | 'workspace'
    | 'repository'
    | 'connection'
    | 'workflow'
    | 'object'
    | 'schema';
  name: string;
  description?: string;
  status?: WorkflowStatus;
  workflowType?: string;
  connector?: string;
  owner?: string;
  metadata?: FlowElementMetadata;
  connections?: string[]; // IDs of connected elements
  position?: { x: number; y: number };
}

/**
 * Enhanced schema section showing comprehensive workspace flow chart
 */
export default function DocumentationSchemaSection() {
  const { repositoriesQuery } = useRepositories();
  const { workflowsQuery } = useWorkflows();
  const { connectionsQuery } = useConnections();
  const { workspaceQuery } = useWorkspaceContext();
  const { schema: workspaceSchema, loading: schemaLoading } =
    useWorkspaceSchema();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [showRelationships, setShowRelationships] = useState(true);
  const [selectedElement, setSelectedElement] = useState<FlowElement | null>(
    null
  );
  const [viewMode, setViewMode] = useState<'flow' | 'tree' | 'detailed'>(
    'flow'
  );

  // Build comprehensive flow elements
  const flowElements = useMemo(() => {
    if (!workspaceQuery?.data?.data) return [];

    const elements: FlowElement[] = [];
    const workspace = workspaceQuery.data.data;
    const workflows = workflowsQuery.data?.data ?? [];
    const repositories = repositoriesQuery.data?.data ?? [];
    const connections = connectionsQuery.data?.data ?? [];

    // Add workspace root
    elements.push({
      id: `workspace-${workspace.slug}`,
      type: 'workspace',
      name: workspace.name,
      description: workspace.description,
      metadata: {
        slug: workspace.slug,
        totalRepositories: repositories.length,
        totalConnections: connections.length,
        totalWorkflows: workflows.length,
      },
    });

    // Add repositories with detailed information
    repositories.forEach((repo, index) => {
      elements.push({
        id: `repository-${repo.slug}`,
        type: 'repository',
        name: repo.name,
        description: repo.description,
        status: '',
        owner: `${repo.owner.first_name} ${repo.owner.last_name}`,
        metadata: {
          slug: repo.slug,
          private: true,
          tags: repo.tags || [],
          objects: [], // We'll populate this if available
        },
        position: { x: 200, y: 100 + index * 120 },
      });
    });

    // Add connections with connector information
    connections.forEach((conn, index) => {
      elements.push({
        id: `connection-${conn.id}`,
        type: 'connection',
        name: conn.name,
        description: conn.description,
        connector: conn.connector.name,
        owner: `${conn.owner.first_name} ${conn.owner.last_name}`,
        metadata: {
          connector: conn.connector,
          details: conn.details,
          settings: conn.settings,
          tags: conn.tags || [],
        },
        position: { x: 600, y: 100 + index * 120 },
      });
    });

    // Add workflows with detailed connections and relationships
    workflows.forEach((workflow, index) => {
      const connections: string[] = [];

      // Determine connections based on workflow type and use type guards
      if (workflow.type === 'import' && workflow.workflowable) {
        // For import workflows, we have connection_id and repository
        connections.push(`connection-${workflow.workflowable.connection_id}`);
        connections.push(`repository-${workflow.workflowable.repository}`);
      } else if (workflow.type === 'export' && workflow.workflowable) {
        // For export workflows, we have repository and connection_id
        connections.push(`repository-${workflow.workflowable.repository}`);
        connections.push(`connection-${workflow.workflowable.connection_id}`);
      }

      elements.push({
        id: `workflow-${workflow.id}`,
        type: 'workflow',
        name: workflow.name,
        description: workflow.description,
        status: workflow.status || '',
        workflowType: workflow.type,
        owner: `${workflow.owner.first_name} ${workflow.owner.last_name}`,
        connections,
        metadata: {
          type: workflow.type,
          schedule: workflow.schedule,
          fieldMappings:
            workflow.type === 'import' || workflow.type === 'export'
              ? workflow.workflowable?.field_mappings || []
              : [],
          tags: workflow.tags || [],
        },
        position: { x: 400, y: 100 + index * 150 },
      });
    });

    return elements;
  }, [
    workspaceQuery,
    repositoriesQuery.data,
    connectionsQuery.data,
    workflowsQuery.data,
  ]);

  // Build enhanced tree structure
  const tree = useMemo(() => {
    if (!workspaceQuery?.data?.data)
      return { id: 'workspace', label: 'Workspace', children: [] };

    const workspace = workspaceQuery.data.data;
    const workflows = workflowsQuery.data?.data ?? [];
    const repositories = repositoriesQuery.data?.data ?? [];
    const connections = connectionsQuery.data?.data ?? [];

    const newTree: TreeNode = {
      id: `workspace-${workspace?.slug}`,
      label: `${workspace?.name} (${repositories.length + connections.length + workflows.length} components)`,
      children: [],
    };

    // Enhanced repositories node with schema information
    if (repositories.length > 0) {
      const repositoriesNode: TreeNode = {
        id: `workspace-${workspace?.slug}-repositories`,
        label: `📁 Repositories (${repositories.length})`,
        children: repositories.map((repository) => ({
          id: `repository-${repository.slug}`,
          label: `${repository.name} - ${repository.owner.first_name} ${repository.owner.last_name}`,
          children: [
            {
              id: `repository-${repository.slug}-schema`,
              label: '🗂️ Schema & Objects',
            },
            {
              id: `repository-${repository.slug}-branches`,
              label: `🌿 Branches`,
            },
          ],
        })),
      };
      newTree.children?.push(repositoriesNode);
    }

    // Enhanced connections node with connector details
    if (connections.length > 0) {
      const connectionsNode: TreeNode = {
        id: `workspace-${workspace?.slug}-connections`,
        label: `🔗 Connections (${connections.length})`,
        children: connections.map((connection) => ({
          id: `connection-${connection.id}`,
          label: `${connection.name} (${connection.connector.name})`,
          children: [
            {
              id: `connection-${connection.id}-schema`,
              label: '🏗️ Connection Schema',
            },
            {
              id: `connection-${connection.id}-config`,
              label: '⚙️ Configuration',
            },
          ],
        })),
      };
      newTree.children?.push(connectionsNode);
    }

    // Enhanced workflows with detailed categorization and relationships
    if (workflows.length > 0) {
      const workflowsNode: TreeNode = {
        id: `workspace-${workspace?.slug}-workflows`,
        label: `⚡ Workflows (${workflows.length})`,
        children: [],
      };

      // Group workflows by type with enhanced information
      const workflowTypes = [
        { type: 'import', icon: '📥', label: 'Import Workflows' },
        { type: 'export', icon: '📤', label: 'Export Workflows' },
        { type: 'action', icon: '🎯', label: 'Action Workflows' },
        { type: 'pipeline', icon: '🔄', label: 'Pipeline Workflows' },
      ];

      workflowTypes.forEach(({ type, icon, label }) => {
        const typeWorkflows = workflows.filter((w) => w.type === type);
        if (typeWorkflows.length > 0) {
          const typeNode: TreeNode = {
            id: `${type}-workflows`,
            label: `${icon} ${label} (${typeWorkflows.length})`,
            children: typeWorkflows.map((workflow) => {
              const children: TreeNode[] = [
                {
                  id: `workflow-${workflow.id}-config`,
                  label: `⚙️ Configuration`,
                },
                {
                  id: `workflow-${workflow.id}-mappings`,
                  label: `🗺️ Field Mappings (${
                    workflow.type === 'import' || workflow.type === 'export'
                      ? workflow.workflowable?.field_mappings?.length || 0
                      : 0
                  })`,
                },
              ];

              // Add schedule information if available
              if (
                workflow.schedule?.triggers &&
                workflow.schedule.triggers.length > 0
              ) {
                children.push({
                  id: `workflow-${workflow.id}-schedule`,
                  label: `⏰ Scheduled (${workflow.schedule.triggers.length} triggers)`,
                });
              }

              // Add connection information based on workflow type
              if (workflow.type === 'import' && workflow.workflowable) {
                children.push({
                  id: `workflow-${workflow.id}-connection`,
                  label: `🔗 Connection`,
                  links: [`connection-${workflow.workflowable.connection_id}`],
                });
                children.push({
                  id: `workflow-${workflow.id}-repository`,
                  label: `📁 Repository`,
                  links: [`repository-${workflow.workflowable.repository}`],
                });
              } else if (workflow.type === 'export' && workflow.workflowable) {
                children.push({
                  id: `workflow-${workflow.id}-repository`,
                  label: `📁 Repository`,
                  links: [`repository-${workflow.workflowable.repository}`],
                });
                children.push({
                  id: `workflow-${workflow.id}-connection`,
                  label: `🔗 Connection`,
                  links: [`connection-${workflow.workflowable.connection_id}`],
                });
              }

              return {
                id: `workflow-${workflow.id}`,
                label: `${workflow.name} (${workflow.status || 'no status'}) - ${workflow.owner.first_name} ${workflow.owner.last_name}`,
                children,
              };
            }),
          };
          workflowsNode.children?.push(typeNode);
        }
      });

      newTree.children?.push(workflowsNode);
    }

    // Add workspace schema if available
    if (
      workspaceSchema &&
      typeof workspaceSchema === 'object' &&
      'name' in workspaceSchema
    ) {
      const schemaNode: TreeNode = {
        id: `workspace-${workspace?.slug}-schema`,
        label: '🏗️ Workspace Schema',
        children: [
          {
            id: `workspace-schema-objects`,
            label: `📋 Schema Information`,
          },
        ],
      };
      newTree.children?.push(schemaNode);
    }

    return newTree;
  }, [
    workspaceQuery,
    repositoriesQuery.data,
    connectionsQuery.data,
    workflowsQuery.data,
    workspaceSchema,
  ]);

  // Filter elements based on search and type
  const filteredElements = useMemo(() => {
    return flowElements.filter((element) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        element.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        element.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        element.owner?.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType =
        selectedTypes.includes('all') || selectedTypes.includes(element.type);

      return matchesSearch && matchesType;
    });
  }, [flowElements, searchTerm, selectedTypes]);

  // Get workflow type icon
  const getWorkflowIcon = (type: string) => {
    switch (type) {
      case 'import':
        return <HiOutlineDownload className='size-4' />;
      case 'export':
        return <HiOutlineUpload className='size-4' />;
      case 'action':
        return <HiOutlinePlay className='size-4' />;
      case 'pipeline':
        return <HiOutlineCog className='size-4' />;
      default:
        return <BsGear className='size-4' />;
    }
  };

  // Get element type icon
  const getElementIcon = (type: string) => {
    switch (type) {
      case 'workspace':
        return <HiOutlineDocumentText className='size-5' />;
      case 'repository':
        return <HiOutlineCollection className='size-5' />;
      case 'connection':
        return <HiOutlineCog className='size-5' />;
      case 'workflow':
        return <HiOutlinePlay className='size-5' />;
      case 'object':
        return <HiOutlineDocument className='size-5' />;
      case 'schema':
        return <HiOutlineDatabase className='size-5' />;
      default:
        return <BsGear className='size-5' />;
    }
  };

  // Handle loading states with improved skeleton
  if (
    repositoriesQuery.isLoading ||
    workflowsQuery.isLoading ||
    connectionsQuery.isLoading ||
    schemaLoading
  ) {
    return (
      <SchemaSkeleton
        showHeader={true}
        showStats={true}
        showControls={true}
        showVisualization={true}
      />
    );
  }

  // Handle error states
  const errors = [
    workspaceQuery.error,
    connectionsQuery.error,
    workflowsQuery.error,
    repositoriesQuery.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return (
      <div
        className={`
          min-h-screen bg-gradient-to-br from-background via-secondary/20
          to-accent/10
        `}
      >
        <div
          className={`
            container mx-auto max-w-7xl px-4 py-8
            md:px-8
          `}
        >
          <QueryError
            error={errors[0]}
            onRetry={() => {
              if (workspaceQuery.error) workspaceQuery.refetch();
              if (connectionsQuery.error) connectionsQuery.refetch();
              if (workflowsQuery.error) workflowsQuery.refetch();
              if (repositoriesQuery.error) repositoriesQuery.refetch();
            }}
            title='Failed to Load Schema'
          />
        </div>
      </div>
    );
  }

  if (!workspaceQuery?.data?.data) return null;

  const workspace = workspaceQuery.data.data;
  const workflows = workflowsQuery.data?.data ?? [];
  const repositories = repositoriesQuery.data?.data ?? [];
  const connections = connectionsQuery.data?.data ?? [];

  // Check if workspace is completely empty
  const isWorkspaceEmpty =
    repositories.length === 0 &&
    connections.length === 0 &&
    workflows.length === 0;

  if (isWorkspaceEmpty) {
    return (
      <div
        className={`
          min-h-screen bg-gradient-to-br from-background via-secondary/20
          to-accent/10
        `}
      >
        <div
          className={`
            container mx-auto max-w-7xl px-4 py-8
            md:px-8
          `}
        >
          {/* Header */}
          <div className='mb-8'>
            <div className='mb-4 flex items-center gap-3'>
              <div className='rounded-xl bg-primary/10 p-3'>
                <BsLayers className='size-8 text-primary' />
              </div>
              <div>
                <h1 className='text-4xl font-bold text-foreground'>
                  Workspace Schema
                </h1>
                <p className='text-lg text-muted-foreground'>
                  Comprehensive flow chart showing all components and their
                  relationships
                </p>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <EmptyState
            icon={<TbFileX className='size-full' />}
            title='No Schema Components Available'
            description="This workspace doesn't have any repositories, connections, or workflows yet. Start by creating your first component to begin visualizing your workspace schema."
            size='lg'
            action={{
              label: 'Get Started',
              href: `/${workspace.slug}`,
              variant: 'default',
            }}
          />
        </div>
      </div>
    );
  }

  // Check if filtered results are empty
  const hasFilteredResults = filteredElements.length > 0;

  return (
    <div
      className={`
        min-h-screen bg-gradient-to-br from-background via-secondary/20
        to-accent/10
      `}
    >
      <div
        className={`
          container mx-auto max-w-7xl px-4 py-8
          md:px-8
        `}
      >
        {/* Header */}
        <div className='mb-8'>
          <div className='mb-4 flex items-center gap-3'>
            <div className='rounded-xl bg-primary/10 p-3'>
              <BsLayers className='size-8 text-primary' />
            </div>
            <div>
              <h1 className='text-4xl font-bold text-foreground'>
                Workspace Schema
              </h1>
              <p className='text-lg text-muted-foreground'>
                Comprehensive flow chart showing all components and their
                relationships
              </p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div
            className={`
              mb-8 grid grid-cols-2 gap-4
              md:grid-cols-4
            `}
          >
            <Card
              className={`
                border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100
                dark:border-blue-800/50 dark:from-blue-950/30
                dark:to-blue-900/30
              `}
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p
                      className={`
                        text-sm font-medium text-blue-600
                        dark:text-blue-400
                      `}
                    >
                      Repositories
                    </p>
                    <p
                      className={`
                        text-2xl font-bold text-blue-900
                        dark:text-blue-100
                      `}
                    >
                      {repositoriesQuery.data?.data?.length || 0}
                    </p>
                  </div>
                  <HiOutlineCollection className='size-8 text-blue-500' />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`
                border-green-200 bg-gradient-to-br from-green-50 to-green-100
                dark:border-green-800/50 dark:from-green-950/30
                dark:to-green-900/30
              `}
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p
                      className={`
                        text-sm font-medium text-green-600
                        dark:text-green-400
                      `}
                    >
                      Connections
                    </p>
                    <p
                      className={`
                        text-2xl font-bold text-green-900
                        dark:text-green-100
                      `}
                    >
                      {connectionsQuery.data?.data?.length || 0}
                    </p>
                  </div>
                  <HiOutlineCog className='size-8 text-green-500' />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`
                border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100
                dark:border-purple-800/50 dark:from-purple-950/30
                dark:to-purple-900/30
              `}
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p
                      className={`
                        text-sm font-medium text-purple-600
                        dark:text-purple-400
                      `}
                    >
                      Workflows
                    </p>
                    <p
                      className={`
                        text-2xl font-bold text-purple-900
                        dark:text-purple-100
                      `}
                    >
                      {workflowsQuery.data?.data?.length || 0}
                    </p>
                  </div>
                  <HiOutlinePlay className='size-8 text-purple-500' />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`
                border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100
                dark:border-orange-800/50 dark:from-orange-950/30
                dark:to-orange-900/30
              `}
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p
                      className={`
                        text-sm font-medium text-orange-600
                        dark:text-orange-400
                      `}
                    >
                      Components
                    </p>
                    <p
                      className={`
                        text-2xl font-bold text-orange-900
                        dark:text-orange-100
                      `}
                    >
                      {flowElements.length}
                    </p>
                  </div>
                  <BsLayers className='size-8 text-orange-500' />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div
          className={`
            mb-8 rounded-2xl border border-border/50 bg-card/30 p-6 shadow-lg
            backdrop-blur-sm
          `}
        >
          <div
            className={`
              flex flex-col gap-6
              lg:flex-row lg:items-center lg:justify-between
            `}
          >
            {/* View Mode Toggle */}
            <div className='flex items-center gap-2'>
              <Button
                variant={viewMode === 'flow' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('flow')}
                className='flex items-center gap-2'
              >
                <BsLayers className='size-4' />
                Flow Chart
              </Button>
              <Button
                variant={viewMode === 'tree' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('tree')}
                className='flex items-center gap-2'
              >
                <HiOutlineFolder className='size-4' />
                Tree View
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('detailed')}
                className='flex items-center gap-2'
              >
                <BsEye className='size-4' />
                Detailed View
              </Button>
            </div>

            {/* Search and Filters */}
            <div className='flex items-center gap-4'>
              <div className='relative'>
                <BsSearch
                  className={`
                    absolute top-1/2 left-3 size-4 -translate-y-1/2 transform
                    text-muted-foreground
                  `}
                />
                <Input
                  placeholder='Search components...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-64 border-border/50 bg-background/50 pl-10'
                />
              </div>

              {/* Type Filters */}
              <div className='flex items-center gap-2'>
                {['all', 'repository', 'connection', 'workflow'].map((type) => (
                  <Button
                    key={type}
                    variant={
                      selectedTypes.includes(type) ? 'default' : 'outline'
                    }
                    size='sm'
                    onClick={() => {
                      if (type === 'all') {
                        setSelectedTypes(['all']);
                      } else {
                        const newTypes = selectedTypes.includes(type)
                          ? selectedTypes.filter((t) => t !== type)
                          : [...selectedTypes.filter((t) => t !== 'all'), type];
                        setSelectedTypes(
                          newTypes.length === 0 ? ['all'] : newTypes
                        );
                      }
                    }}
                    className='capitalize'
                  >
                    {type}
                  </Button>
                ))}
              </div>

              {/* Display Options */}
              <div className='flex items-center gap-2'>
                <Button
                  variant={showDataFlow ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setShowDataFlow(!showDataFlow)}
                  className='flex items-center gap-2'
                >
                  {showDataFlow ? (
                    <BsToggleOn className='size-4' />
                  ) : (
                    <BsToggleOff className='size-4' />
                  )}
                  Data Flow
                </Button>
                <Button
                  variant={showRelationships ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setShowRelationships(!showRelationships)}
                  className='flex items-center gap-2'
                >
                  {showRelationships ? (
                    <BsToggleOn className='size-4' />
                  ) : (
                    <BsToggleOff className='size-4' />
                  )}
                  Relationships
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div
          className={`
            grid grid-cols-1 gap-8
            xl:grid-cols-4
          `}
        >
          {/* Visualization Area */}
          <div className='xl:col-span-3'>
            <Card
              className={`
                border-border/50 bg-card/50 shadow-lg backdrop-blur-sm
              `}
            >
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <BsLayers className='size-5' />
                  {viewMode === 'flow'
                    ? 'Flow Chart View'
                    : viewMode === 'tree'
                      ? 'Tree Structure View'
                      : 'Detailed Component View'}
                </CardTitle>
                <CardDescription>
                  {viewMode === 'flow'
                    ? 'Interactive flow chart showing data movement and relationships'
                    : viewMode === 'tree'
                      ? 'Hierarchical tree view of workspace components'
                      : 'Detailed grid view of all components with metadata'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasFilteredResults ? (
                  <EmptyState
                    icon={<TbClipboardX className='size-full' />}
                    title='No Components Match Your Search'
                    description={`No components found matching "${searchTerm}" with the selected filters. Try adjusting your search terms or filters.`}
                    size='md'
                    action={{
                      label: 'Clear Filters',
                      onClick: () => {
                        setSearchTerm('');
                        setSelectedTypes(['all']);
                      },
                      variant: 'outline',
                    }}
                  />
                ) : viewMode === 'tree' ? (
                  <div className='h-[calc(100vh-400px)] w-full'>
                    <TreeChart tree={tree} />
                  </div>
                ) : viewMode === 'detailed' ? (
                  <div
                    className={`
                      grid max-h-[calc(100vh-400px)] grid-cols-1 gap-4
                      overflow-y-auto
                      md:grid-cols-2
                    `}
                  >
                    {filteredElements.map((element) => (
                      <Card
                        key={element.id}
                        className={`
                          group cursor-pointer transition-all duration-200
                          hover:shadow-lg
                        `}
                        onClick={() => setSelectedElement(element)}
                      >
                        <CardHeader className='pb-3'>
                          <div className='flex items-start justify-between'>
                            <div className='flex items-center gap-3'>
                              <div
                                className={`
                                  rounded-lg p-2
                                  ${
                                    element.type === 'repository'
                                      ? 'bg-blue-500/10 text-blue-600'
                                      : element.type === 'connection'
                                        ? 'bg-green-500/10 text-green-600'
                                        : element.type === 'workflow'
                                          ? 'bg-purple-500/10 text-purple-600'
                                          : 'bg-gray-500/10 text-gray-600'
                                  }
                                `}
                              >
                                {getElementIcon(element.type)}
                              </div>
                              <div>
                                <CardTitle className='text-sm font-semibold'>
                                  {element.name}
                                </CardTitle>
                                <div className='mt-1 flex items-center gap-2'>
                                  <Badge
                                    variant='outline'
                                    className='text-xs capitalize'
                                  >
                                    {element.type}
                                  </Badge>
                                  {element.workflowType && (
                                    <Badge
                                      variant='secondary'
                                      className={`
                                        flex items-center gap-1 text-xs
                                      `}
                                    >
                                      {getWorkflowIcon(element.workflowType)}
                                      {element.workflowType}
                                    </Badge>
                                  )}
                                  {element.status &&
                                    element.status.length > 0 && (
                                      <StatusBadge
                                        status={element.status}
                                        label={element.status}
                                      />
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {element.description && (
                            <CardDescription className='mt-2 text-xs'>
                              {element.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className='pt-0'>
                          <div
                            className={`space-y-2 text-xs text-muted-foreground`}
                          >
                            {element.owner && (
                              <div className='flex items-center gap-2'>
                                <span className='font-medium'>Owner:</span>
                                <span>{element.owner}</span>
                              </div>
                            )}
                            {element.connector && (
                              <div className='flex items-center gap-2'>
                                <span className='font-medium'>Connector:</span>
                                <span>{element.connector}</span>
                              </div>
                            )}
                            {element.connections &&
                              element.connections.length > 0 && (
                                <div className='flex items-center gap-2'>
                                  <span className='font-medium'>
                                    Connected to:
                                  </span>
                                  <span>
                                    {element.connections.length} components
                                  </span>
                                </div>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className='h-[calc(100vh-400px)] w-full'>
                    <TreeChart tree={tree} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className='xl:col-span-1'>
            <Card
              className={`
                border-border/50 bg-card/50 shadow-lg backdrop-blur-sm
              `}
            >
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <BsEye className='size-5' />
                  {selectedElement ? 'Component Details' : 'Workspace Overview'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedElement ? (
                  <div className='space-y-4'>
                    <div className='flex items-center gap-3 border-b pb-4'>
                      <div
                        className={`
                          rounded-lg p-3
                          ${
                            selectedElement.type === 'repository'
                              ? 'bg-blue-500/10 text-blue-600'
                              : selectedElement.type === 'connection'
                                ? 'bg-green-500/10 text-green-600'
                                : selectedElement.type === 'workflow'
                                  ? 'bg-purple-500/10 text-purple-600'
                                  : 'bg-gray-500/10 text-gray-600'
                          }
                        `}
                      >
                        {getElementIcon(selectedElement.type)}
                      </div>
                      <div>
                        <h3 className='font-semibold text-foreground'>
                          {selectedElement.name}
                        </h3>
                        <div className='mt-1 flex items-center gap-2'>
                          <Badge
                            variant='outline'
                            className='text-xs capitalize'
                          >
                            {selectedElement.type}
                          </Badge>
                          {selectedElement.status &&
                            selectedElement.status.length > 0 && (
                              <StatusBadge
                                status={selectedElement.status}
                                label={selectedElement.status}
                              />
                            )}
                        </div>
                      </div>
                    </div>

                    {selectedElement.description && (
                      <div>
                        <h4 className='mb-2 text-sm font-medium text-foreground'>
                          Description
                        </h4>
                        <p className='text-sm text-muted-foreground'>
                          {selectedElement.description}
                        </p>
                      </div>
                    )}

                    {selectedElement.owner && (
                      <div>
                        <h4 className='mb-2 text-sm font-medium text-foreground'>
                          Owner
                        </h4>
                        <p className='text-sm text-muted-foreground'>
                          {selectedElement.owner}
                        </p>
                      </div>
                    )}

                    {selectedElement.connector && (
                      <div>
                        <h4 className='mb-2 text-sm font-medium text-foreground'>
                          Connector
                        </h4>
                        <p className='text-sm text-muted-foreground'>
                          {selectedElement.connector}
                        </p>
                      </div>
                    )}

                    {selectedElement.metadata && (
                      <div>
                        <h4 className='mb-2 text-sm font-medium text-foreground'>
                          Metadata
                        </h4>
                        <div className='space-y-2'>
                          {Object.entries(selectedElement.metadata).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className='flex justify-between text-sm'
                              >
                                <span
                                  className={`text-muted-foreground capitalize`}
                                >
                                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                  :
                                </span>
                                <span className='text-foreground'>
                                  {Array.isArray(value)
                                    ? value.length
                                    : value?.toString()}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {selectedElement.connections &&
                      selectedElement.connections.length > 0 && (
                        <div>
                          <h4
                            className={`
                              mb-2 text-sm font-medium text-foreground
                            `}
                          >
                            Connections
                          </h4>
                          <div className='space-y-1'>
                            {selectedElement.connections.map((connId) => {
                              const connectedElement = flowElements.find(
                                (el) => el.id === connId
                              );
                              return connectedElement ? (
                                <div
                                  key={connId}
                                  className='flex items-center gap-2 text-sm'
                                >
                                  <BsArrowRight
                                    className={`size-3 text-muted-foreground`}
                                  />
                                  <span className='text-muted-foreground'>
                                    {connectedElement.name}
                                  </span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setSelectedElement(null)}
                      className='w-full'
                    >
                      Close Details
                    </Button>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    <div>
                      <h4 className='mb-2 text-sm font-medium text-foreground'>
                        Component Summary
                      </h4>
                      <div className='space-y-2'>
                        <div className='flex justify-between text-sm'>
                          <span className='text-muted-foreground'>
                            Repositories:
                          </span>
                          <span className='text-foreground'>
                            {repositoriesQuery.data?.data?.length || 0}
                          </span>
                        </div>
                        <div className='flex justify-between text-sm'>
                          <span className='text-muted-foreground'>
                            Connections:
                          </span>
                          <span className='text-foreground'>
                            {connectionsQuery.data?.data?.length || 0}
                          </span>
                        </div>
                        <div className='flex justify-between text-sm'>
                          <span className='text-muted-foreground'>
                            Workflows:
                          </span>
                          <span className='text-foreground'>
                            {workflowsQuery.data?.data?.length || 0}
                          </span>
                        </div>
                        <div className='flex justify-between text-sm'>
                          <span className='text-muted-foreground'>
                            Total Components:
                          </span>
                          <span className='font-medium text-foreground'>
                            {flowElements.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className='mb-2 text-sm font-medium text-foreground'>
                        Workflow Types
                      </h4>
                      <div className='space-y-2'>
                        {['import', 'export', 'action', 'pipeline'].map(
                          (type) => {
                            const count =
                              workflowsQuery.data?.data?.filter(
                                (w) => w.type === type
                              ).length || 0;
                            return (
                              <div
                                key={type}
                                className='flex justify-between text-sm'
                              >
                                <span
                                  className={`
                                    flex items-center gap-2
                                    text-muted-foreground capitalize
                                  `}
                                >
                                  {getWorkflowIcon(type)}
                                  {type}:
                                </span>
                                <span className='text-foreground'>{count}</span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className='border-t pt-4'>
                      <p className='text-xs text-muted-foreground'>
                        Click on any component in the visualization to view
                        detailed information.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
