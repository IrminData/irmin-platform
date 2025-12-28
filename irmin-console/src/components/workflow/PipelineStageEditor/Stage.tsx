'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { IoInformationCircle } from 'react-icons/io5';
import {
  TbArrowDown,
  TbArrowUp,
  TbChevronDown,
  TbChevronRight,
  TbDatabaseExport,
  TbDatabaseImport,
  TbTrash,
} from 'react-icons/tb';

import IrminCore from '@/lib/core';

import ConnectionPathSelector from '@/components/connection/ConnectionPathSelector';
import InlineQueryEditor from '@/components/query/InlineQueryEditor';
import RepositoryPathSelector from '@/components/repository/objects/RepositoryPathSelector';
import { ObjectSchemaBuilder } from '@/components/schema-builder';
import InlineScriptEditor from '@/components/scripts/InlineScriptEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import MultiplePathsSelector from '@/components/workflow/MultiplePathsSelector';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useConnections, useRepositories, useWorkflows } from '@/hooks/api';
import { useBaseUrl } from '@/hooks/utils';

import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type { PipelineStage } from '@/types/core/Workflow';

const defaultStage: PipelineStage = {
  type: 'action',
  executable_type: 'script',
  script_id: undefined,
  query_id: undefined,
  description: '',
  write: false,
  read: false,
  order_sequence: 0,
};

/**
 * UI component for editing a pipeline stage.
 *
 * @param props - The component props.
 * @param props.index - The index of the stage in the pipeline.
 * @param props.initialStage - The initial stage to display.
 * @param props.updateStage - The function to call when the stage is updated.
 * @param props.moveStageUp - The function to call when the stage is moved up.
 * @param props.moveStageDown - The function to call when the stage is moved down.
 * @param props.removeStage - The function to call when the stage is removed.
 * @param props.readOnly - Whether the stage is read-only.
 * @param props.currentWorkflowID - The current workflow ID (to prevent self-reference).
 *
 * @returns The rendered component.
 */
function Stage({
  index,
  initialStage,
  updateStage,
  moveStageUp,
  moveStageDown,
  removeStage,
  readOnly,
  defaultCollapsed = false,
  isLastStage = false,
  currentWorkflowID,
}: {
  index: number;
  initialStage?: PipelineStage;
  updateStage: (_stage: PipelineStage) => void;
  moveStageUp?: () => void;
  moveStageDown?: () => void;
  removeStage?: () => void;
  readOnly: boolean;
  defaultCollapsed?: boolean;
  isLastStage?: boolean;
  currentWorkflowID?: string;
}) {
  const { connectionsQuery } = useConnections();
  const { repositoriesQuery } = useRepositories();
  const { workflowsQuery } = useWorkflows();
  const { workspaceSlug } = useWorkspaceContext();
  const { getToken } = useIAM();
  const { dict, locale } = useLocale();

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed ?? false);
  const [stage, setStage] = useState<PipelineStage>(
    initialStage ?? defaultStage
  );
  const prevStageRef = useRef<PipelineStage>(stage);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced update function
  const debouncedUpdate = useCallback(
    (newStage: PipelineStage) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        const hasChanged =
          JSON.stringify(prevStageRef.current) !== JSON.stringify(newStage);
        if (hasChanged) {
          prevStageRef.current = newStage;
          updateStage(newStage);
        }
      }, 300);
    },
    [updateStage]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Handle stage updates
  useEffect(() => {
    debouncedUpdate(stage);
  }, [stage, debouncedUpdate]);

  // Handle initial stage changes
  useEffect(() => {
    const newStage = initialStage ?? defaultStage;
    queueMicrotask(() => {
      setStage(newStage);
      prevStageRef.current = newStage;
    });
  }, [initialStage]);

  const [connectionPushSchema, setConnectionPushSchema] =
    useState<ObjectSchema | null>(null);
  const [connectionPullSchema, setConnectionPullSchema] =
    useState<ObjectSchema | null>(null);
  const connectionSchemaFetchedFor = useRef<string | null>(null);
  const fetchConnectionSchemas = useCallback(
    async (connectionId: string) => {
      try {
        if (!connectionId) return;
        if (connectionSchemaFetchedFor.current === connectionId) return;
        connectionSchemaFetchedFor.current = connectionId;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const newPushSchema =
          await irminCore.connectionService.fetchConnectionSchema({
            workspace: workspaceSlug,
            connectionID: connectionId,
            operationMethod: 'push',
          });
        const newPullSchema =
          await irminCore.connectionService.fetchConnectionSchema({
            workspace: workspaceSlug,
            connectionID: connectionId,
            operationMethod: 'pull',
          });
        setConnectionPushSchema(newPushSchema?.data ?? null);
        setConnectionPullSchema(newPullSchema?.data ?? null);
      } catch (error) {
        console.error(error);
      }
    },
    [workspaceSlug, locale, getToken]
  );

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const getStageTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'action':
        return 'default';
      case 'connection':
        return 'secondary';
      case 'repository':
        return 'outline';
      case 'repository_action':
        return 'outline';
      case 'trigger_workflow':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div
      className={`
        relative z-10 rounded-lg border border-foreground/20 bg-card shadow-xs
        transition-all
        hover:shadow-md
      `}
    >
      <div className='flex items-center justify-between gap-4 p-4'>
        <div className='flex flex-1 items-center gap-4'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => setIsCollapsed(!isCollapsed)}
            className='size-8 shrink-0'
          >
            {isCollapsed ? (
              <TbChevronRight className='size-5' />
            ) : (
              <TbChevronDown className='size-5' />
            )}
          </Button>

          <div className='flex flex-1 items-center gap-3 overflow-hidden'>
            <Badge variant={getStageTypeBadgeVariant(stage.type)}>
              {stage.type === 'action' && dict.workflow.action}
              {stage.type === 'connection' && dict.connections.connection}
              {stage.type === 'repository' && dict.repository.repository}
              {stage.type === 'repository_action' &&
                dict.workflow.pipeline.repositoryAction}
              {stage.type === 'trigger_workflow' &&
                dict.workflow.pipeline.triggerWorkflow}
              {stage.type === 'validation' && dict.workflow.pipeline.validation}
              {stage.type === 'transform' && dict.workflow.pipeline.transform}
            </Badge>

            {stage.description && (
              <span className='truncate text-sm font-medium text-foreground/80'>
                {stage.description}
              </span>
            )}
            {!stage.description && (
              <span className='text-sm text-muted-foreground italic'>
                {dict.workflow.pipeline.descriptionPlaceholder}
              </span>
            )}
          </div>

          <div
            className={`
              hidden items-center gap-2
              sm:flex
            `}
          >
            {stage.read && (
              <Badge variant='outline' className='gap-1 text-xs'>
                <TbDatabaseExport className='size-3' />
                {dict.workflow.pipeline.read}
              </Badge>
            )}
            {stage.write && (
              <Badge variant='outline' className='gap-1 text-xs'>
                <TbDatabaseImport className='size-3' />
                {dict.workflow.pipeline.write}
              </Badge>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className='flex items-center gap-1'>
            {moveStageUp && (
              <Button
                type='button'
                onClick={() => moveStageUp()}
                variant='ghost'
                size='icon'
                className='size-8'
                title={dict.workflow.pipeline.moveUp}
              >
                <TbArrowUp className='size-4' />
              </Button>
            )}
            {moveStageDown && (
              <Button
                type='button'
                onClick={() => moveStageDown()}
                variant='ghost'
                size='icon'
                className='size-8'
                title={dict.workflow.pipeline.moveDown}
              >
                <TbArrowDown className='size-4' />
              </Button>
            )}
            {removeStage && (
              <Button
                type='button'
                onClick={() => removeStage()}
                variant='ghost'
                size='icon'
                className={`
                  size-8 text-destructive
                  hover:text-destructive
                `}
                title={dict.common.remove}
              >
                <TbTrash className='size-4' />
              </Button>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className='space-y-4 border-t bg-background p-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor={`description-${index}`}>
              {dict.common.description}
            </Label>
            <Input
              id={`description-${index}`}
              placeholder={dict.workflow.pipeline.descriptionPlaceholder}
              value={stage.description}
              onChange={(e) =>
                setStage((prevStage) => ({
                  ...prevStage,
                  description: e.target.value,
                }))
              }
              readOnly={readOnly}
            />
          </div>

          {/* Only show read/write switches for stages that pass data between stages */}
          {(stage.type === 'action' ||
            stage.type === 'connection' ||
            stage.type === 'repository') && (
            <div
              className={`
                grid gap-4
                sm:grid-cols-2
              `}
            >
              <div className='flex items-center space-x-2 rounded-md border p-3'>
                <Switch
                  id={`write-${index}`}
                  checked={stage.write}
                  onCheckedChange={(checked) =>
                    setStage((prevStage) => ({
                      ...prevStage,
                      write: checked,
                    }))
                  }
                  disabled={readOnly || index === 0}
                />
                <div className='flex flex-col'>
                  <div className='flex items-center gap-2'>
                    <Label
                      htmlFor={`write-${index}`}
                      className={index === 0 ? 'text-muted-foreground' : ''}
                    >
                      {dict.workflow.pipeline.write}
                    </Label>
                    <span className='text-xs font-normal text-muted-foreground'>
                      {dict.workflow.pipeline.writeDescription}
                    </span>
                  </div>
                  {index === 0 && (
                    <span
                      className={`
                        pt-1 pl-1 text-xs text-muted-foreground italic
                      `}
                    >
                      {dict.workflow.pipeline.firstStageCannotWrite}
                    </span>
                  )}
                </div>
              </div>

              <div className='flex items-center space-x-2 rounded-md border p-3'>
                <Switch
                  id={`read-${index}`}
                  checked={stage.read}
                  onCheckedChange={(checked) =>
                    setStage((prevStage) => ({
                      ...prevStage,
                      read: checked,
                    }))
                  }
                  disabled={readOnly || isLastStage}
                />
                <div className='flex flex-col'>
                  <div className='flex items-center gap-2'>
                    <Label
                      htmlFor={`read-${index}`}
                      className={isLastStage ? 'text-muted-foreground' : ''}
                    >
                      {dict.workflow.pipeline.read}
                    </Label>
                    <span className='text-xs font-normal text-muted-foreground'>
                      {dict.workflow.pipeline.readDescription}
                    </span>
                  </div>
                  {isLastStage && (
                    <span
                      className={`
                        pt-1 pl-1 text-xs text-muted-foreground italic
                      `}
                    >
                      {dict.workflow.pipeline.lastStageCannotRead}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className='flex flex-col gap-2'>
            <Label htmlFor={`type-select-${index}`}>
              {dict.repository.objects.type}
            </Label>
            <Select
              value={stage.type}
              onValueChange={(value) => {
                if (value === 'action') {
                  setStage((prevStage) => {
                    const prevActionStage =
                      prevStage.type === 'action'
                        ? (prevStage as Extract<
                            PipelineStage,
                            { type: 'action' }
                          >)
                        : null;
                    return {
                      type: 'action',
                      executable_type:
                        prevActionStage?.executable_type || 'script',
                      script_id:
                        prevActionStage?.executable_type === 'script'
                          ? prevActionStage.script_id
                          : undefined,
                      query_id:
                        prevActionStage?.executable_type === 'query'
                          ? prevActionStage.query_id
                          : undefined,
                      description: prevStage.description,
                      write: prevStage.write,
                      read: prevStage.read,
                      order_sequence: prevStage.order_sequence,
                    };
                  });
                } else if (value === 'connection') {
                  setStage((prevStage) => ({
                    type: 'connection',
                    connection_id: '',
                    connection_write_path: '',
                    connection_read_paths: [],
                    description: prevStage.description,
                    write: prevStage.write,
                    read: prevStage.read,
                    order_sequence: prevStage.order_sequence,
                  }));
                } else if (value === 'repository') {
                  setStage((prevStage) => ({
                    type: 'repository',
                    repository: '',
                    repository_branch: '',
                    repository_write_path: '',
                    repository_read_paths: [],
                    description: prevStage.description,
                    write: prevStage.write,
                    read: prevStage.read,
                    order_sequence: prevStage.order_sequence,
                  }));
                } else if (value === 'repository_action') {
                  setStage((prevStage) => ({
                    type: 'repository_action',
                    repository_action_type: 'commit',
                    repository_action_repository: '',
                    repository_action_branch: '',
                    description: prevStage.description,
                    write: false,
                    read: false,
                    order_sequence: prevStage.order_sequence,
                  }));
                } else if (value === 'trigger_workflow') {
                  setStage((prevStage) => ({
                    type: 'trigger_workflow',
                    trigger_workflow_id: '',
                    description: prevStage.description,
                    write: false,
                    read: false,
                    order_sequence: prevStage.order_sequence,
                  }));
                } else if (value === 'validation') {
                  setStage((prevStage) => ({
                    type: 'validation',
                    validation_schema: {
                      name: '',
                      path: '',
                      type: 'structured',
                      content_type: 'application/json',
                      schema: {
                        type: 'object',
                        properties: {},
                        required: [],
                      },
                    },
                    validation_mode: 'all',
                    fail_on_error: true,
                    description: prevStage.description,
                    write: false,
                    read: false,
                    order_sequence: prevStage.order_sequence,
                  }));
                } else if (value === 'transform') {
                  setStage((prevStage) => ({
                    type: 'transform',
                    transform_operation: 'field_rename',
                    transform_mode: 'all',
                    transform_field_renames: [],
                    transform_fields_to_remove: [],
                    transform_output_format: 'json',
                    description: prevStage.description,
                    write: false,
                    read: true,
                    order_sequence: prevStage.order_sequence,
                  }));
                }
              }}
              disabled={readOnly}
            >
              <SelectTrigger id={`type-select-${index}`} className='w-full'>
                <SelectValue>
                  {stage.type === 'action' && dict.workflow.action}
                  {stage.type === 'connection' && dict.connections.connection}
                  {stage.type === 'repository' && dict.repository.repository}
                  {stage.type === 'repository_action' &&
                    dict.workflow.pipeline.repositoryAction}
                  {stage.type === 'trigger_workflow' &&
                    dict.workflow.pipeline.triggerWorkflow}
                  {stage.type === 'validation' &&
                    dict.workflow.pipeline.validation}
                  {stage.type === 'transform' &&
                    dict.workflow.pipeline.transform}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='action'>{dict.workflow.action}</SelectItem>
                <SelectItem value='connection'>
                  {dict.connections.connection}
                </SelectItem>
                <SelectItem value='repository'>
                  {dict.repository.repository}
                </SelectItem>
                <SelectItem value='repository_action'>
                  {dict.workflow.pipeline.repositoryAction}
                </SelectItem>
                <SelectItem value='trigger_workflow'>
                  {dict.workflow.pipeline.triggerWorkflow}
                </SelectItem>
                <SelectItem value='validation'>
                  {dict.workflow.pipeline.validation}
                </SelectItem>
                <SelectItem value='transform'>
                  {dict.workflow.pipeline.transform}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {stage.type &&
            dict.workflow.pipeline.stageTypeDescription[
              stage.type as keyof typeof dict.workflow.pipeline.stageTypeDescription
            ] && (
              <div
                className={`
                  flex items-start gap-3 rounded-lg border
                  border-accent-foreground/10 bg-accent/10 p-3
                  dark:border-accent-foreground dark:bg-accent/10
                `}
              >
                <IoInformationCircle
                  className={`mt-0.5 size-5 shrink-0 text-accent`}
                />
                <p className={`text-sm text-accent-foreground`}>
                  {
                    dict.workflow.pipeline.stageTypeDescription[
                      stage.type as keyof typeof dict.workflow.pipeline.stageTypeDescription
                    ]
                  }
                </p>
              </div>
            )}

          {stage.type === 'action' && (
            <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`executable-type-${index}`}>
                  {dict.workflow.executableType}
                </Label>
                <Select
                  value={stage.executable_type || 'script'}
                  onValueChange={(value) => {
                    if (value === 'script') {
                      setStage((prevStage) => {
                        if (prevStage.type !== 'action') return prevStage;
                        return {
                          ...prevStage,
                          executable_type: 'script',
                          script_id: prevStage.script_id,
                          query_id: undefined,
                        };
                      });
                    } else if (value === 'query') {
                      setStage((prevStage) => {
                        if (prevStage.type !== 'action') return prevStage;
                        return {
                          ...prevStage,
                          executable_type: 'query',
                          script_id: undefined,
                          query_id: prevStage.query_id,
                        };
                      });
                    }
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    id={`executable-type-${index}`}
                    className='w-full'
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='script'>
                      {dict.scripts.script}
                    </SelectItem>
                    <SelectItem value='query'>{dict.query.query}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(!stage.executable_type ||
                stage.executable_type === 'script') && (
                <InlineScriptEditor
                  currentScriptId={stage.script_id ?? null}
                  onScriptIdChange={(scriptId) =>
                    setStage((prevStage) => {
                      if (prevStage.type !== 'action') return prevStage;
                      return {
                        ...prevStage,
                        script_id: scriptId,
                      };
                    })
                  }
                  disabled={readOnly}
                />
              )}
              {stage.executable_type === 'query' && (
                <InlineQueryEditor
                  currentQueryId={stage.query_id ?? null}
                  onQueryIdChange={(queryId) =>
                    setStage((prevStage) => {
                      if (prevStage.type !== 'action') return prevStage;
                      return {
                        ...prevStage,
                        query_id: queryId,
                      };
                    })
                  }
                  disabled={readOnly}
                />
              )}
            </>
          )}

          {stage.type === 'connection' && (
            <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`connection-select-${index}`}>
                  {dict.connections.connection}
                </Label>
                <Select
                  value={stage.connection_id}
                  onValueChange={(value) => {
                    if (!value) return;
                    void fetchConnectionSchemas(value);
                    setStage((prevStage) => ({
                      ...prevStage,
                      connection_id: value,
                    }));
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    id={`connection-select-${index}`}
                    className='w-full'
                  >
                    <SelectValue>
                      {connectionsQuery.data?.data?.find(
                        (c) => c.id === stage.connection_id
                      )?.name ?? stage.connection_id}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {connectionsQuery.data?.data?.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {stage.connection_id && (
                  <Button
                    href={`${workspaceUrl}/connections/${stage.connection_id}`}
                    target='_blank'
                    variant='secondary'
                    className='w-full'
                    size={'sm'}
                  >
                    {dict.list.view}
                  </Button>
                )}
                {!readOnly && (
                  <Button
                    href={`${workspaceUrl}/connections?create`}
                    target='_blank'
                    variant='gray'
                    className='w-full'
                    size={'sm'}
                  >
                    {dict.consoleNavigation.staticSearchItems.createConnection}
                  </Button>
                )}
              </div>
              {stage.connection_id && stage.write && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`connection_write_path-${index}`}>
                    {dict.workflow.pipeline.connectionWritePath}
                  </Label>
                  {!readOnly && connectionPushSchema ? (
                    <ConnectionPathSelector
                      rootSchema={connectionPushSchema}
                      connectionId={stage.connection_id}
                      defaultPath={stage.connection_write_path ?? ''}
                      operationMethod={'push'}
                      onPathChange={(path) => {
                        setStage((prevStage) => ({
                          ...prevStage,
                          connection_write_path: path,
                        }));
                      }}
                    />
                  ) : (
                    <Input
                      id={`connection_write_path-${index}`}
                      placeholder={
                        dict.workflow.pipeline.connectionWritePathDescription
                      }
                      value={stage.connection_write_path}
                      onChange={(e) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          connection_write_path: e.target.value,
                        }))
                      }
                      readOnly={readOnly || !stage.connection_id}
                    />
                  )}
                </div>
              )}
              {stage.connection_id && stage.read && (
                <div className='flex flex-col gap-2'>
                  {!readOnly && connectionPullSchema ? (
                    <MultiplePathsSelector
                      label={dict.workflow.pipeline.connectionReadPath}
                      paths={stage.connection_read_paths}
                      onPathsChange={(paths) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          connection_read_paths: paths,
                        }))
                      }
                      renderPathSelector={(path, onPathChange) => (
                        <ConnectionPathSelector
                          rootSchema={connectionPullSchema}
                          connectionId={stage.connection_id}
                          defaultPath={path}
                          operationMethod={'pull'}
                          onPathChange={onPathChange}
                        />
                      )}
                    />
                  ) : (
                    <div className='flex flex-col gap-2'>
                      <Label htmlFor={`connection_read_paths-${index}`}>
                        {dict.workflow.pipeline.connectionReadPath}
                      </Label>
                      <Input
                        id={`connection_read_paths-${index}`}
                        placeholder={
                          dict.workflow.pipeline.connectionReadPathDescription
                        }
                        value={stage.connection_read_paths?.join(', ') ?? ''}
                        onChange={(e) =>
                          setStage((prevStage) => ({
                            ...prevStage,
                            connection_read_paths: e.target.value
                              ? e.target.value.split(',').map((p) => p.trim())
                              : [],
                          }))
                        }
                        readOnly={readOnly || !stage.connection_id}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {stage.type === 'repository' && (
            <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`repository-select-${index}`}>
                  {dict.repository.repository}
                </Label>
                <Select
                  value={stage.repository}
                  onValueChange={(value) => {
                    if (!value) return;
                    setStage((prevStage) => ({
                      ...prevStage,
                      repository: value,
                    }));
                  }}
                  disabled={readOnly || repositoriesQuery.isLoading}
                >
                  <SelectTrigger
                    id={`repository-select-${index}`}
                    className='w-full'
                  >
                    <SelectValue>
                      {repositoriesQuery.data?.data?.find(
                        (r) => r.slug === stage.repository
                      )?.name ?? stage.repository}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {repositoriesQuery.data?.data?.map((repo) => (
                      <SelectItem key={repo.slug} value={repo.slug}>
                        {repo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {stage.repository && (
                  <Button
                    href={`${workspaceUrl}/repositories/${stage.repository}`}
                    target='_blank'
                    variant='secondary'
                    className='w-full'
                    size={'sm'}
                  >
                    {dict.list.view}
                  </Button>
                )}
                {!readOnly && (
                  <Button
                    href={`${workspaceUrl}/repositories?create`}
                    target='_blank'
                    variant='gray'
                    className='w-full'
                    size={'sm'}
                  >
                    {dict.consoleNavigation.staticSearchItems.createRepository}
                  </Button>
                )}
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`branch-${index}`}>
                  {dict.repository.branches.branch}
                </Label>
                <Input
                  id={`branch-${index}`}
                  value={stage.repository_branch}
                  onChange={(e) =>
                    setStage((prevStage) => ({
                      ...prevStage,
                      repository_branch: e.target.value,
                    }))
                  }
                  readOnly={readOnly || !stage.repository}
                />
              </div>
              {stage.write && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`write_path-${index}`}>
                    {dict.workflow.pipeline.connectionWritePath}
                  </Label>
                  {!readOnly && stage.repository && stage.repository_branch ? (
                    <RepositoryPathSelector
                      repositorySlug={stage.repository}
                      repositoryRef={stage.repository_branch}
                      defaultPath={stage.repository_write_path ?? ''}
                      onPathChange={(path) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          repository_write_path: path,
                        }))
                      }
                    />
                  ) : (
                    <Input
                      id={`write_path-${index}`}
                      value={stage.repository_write_path ?? ''}
                      onChange={(e) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          repository_write_path: e.target.value,
                        }))
                      }
                      readOnly={readOnly}
                    />
                  )}
                </div>
              )}
              {stage.read && (
                <div className='flex flex-col gap-2'>
                  {!readOnly && stage.repository && stage.repository_branch ? (
                    <MultiplePathsSelector
                      label={dict.repository.objects.path}
                      paths={stage.repository_read_paths}
                      onPathsChange={(paths) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          repository_read_paths: paths,
                        }))
                      }
                      renderPathSelector={(path, onPathChange) => (
                        <RepositoryPathSelector
                          repositorySlug={stage.repository}
                          repositoryRef={stage.repository_branch}
                          defaultPath={path}
                          onPathChange={onPathChange}
                        />
                      )}
                    />
                  ) : (
                    <div className='flex flex-col gap-2'>
                      <Label htmlFor={`read_paths-${index}`}>
                        {dict.repository.objects.path}
                      </Label>
                      <Input
                        id={`read_paths-${index}`}
                        value={stage.repository_read_paths?.join(', ') ?? ''}
                        onChange={(e) =>
                          setStage((prevStage) => ({
                            ...prevStage,
                            repository_read_paths: e.target.value
                              ? e.target.value.split(',').map((p) => p.trim())
                              : [],
                          }))
                        }
                        readOnly={readOnly}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {stage.type === 'repository_action' && (
            <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`action-type-${index}`}>
                  {dict.workflow.pipeline.actionType}
                </Label>
                <Select
                  value={stage.repository_action_type}
                  onValueChange={(value) => {
                    setStage((prevStage) => ({
                      ...prevStage,
                      repository_action_type: value as
                        | 'commit'
                        | 'merge'
                        | 'revert'
                        | 'delete',
                    }));
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger id={`action-type-${index}`} className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='commit'>
                      {dict.workflow.pipeline.commit}
                    </SelectItem>
                    <SelectItem value='merge'>
                      {dict.workflow.pipeline.merge}
                    </SelectItem>
                    <SelectItem value='revert'>
                      {dict.workflow.pipeline.revert}
                    </SelectItem>
                    <SelectItem value='delete'>
                      {dict.workflow.pipeline.delete}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex flex-col gap-2'>
                <Label htmlFor={`repo-action-repository-${index}`}>
                  {dict.repository.repository}
                </Label>
                <Select
                  value={stage.repository_action_repository}
                  onValueChange={(value) => {
                    if (!value) return;
                    setStage((prevStage) => ({
                      ...prevStage,
                      repository_action_repository: value,
                    }));
                  }}
                  disabled={readOnly || repositoriesQuery.isLoading}
                >
                  <SelectTrigger
                    id={`repo-action-repository-${index}`}
                    className='w-full'
                  >
                    <SelectValue>
                      {repositoriesQuery.data?.data?.find(
                        (r) => r.slug === stage.repository_action_repository
                      )?.name ?? stage.repository_action_repository}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {repositoriesQuery.data?.data?.map((repo) => (
                      <SelectItem key={repo.slug} value={repo.slug}>
                        {repo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='flex flex-col gap-2'>
                <Label htmlFor={`repo-action-branch-${index}`}>
                  {dict.repository.branches.branch}
                </Label>
                <Input
                  id={`repo-action-branch-${index}`}
                  value={stage.repository_action_branch}
                  onChange={(e) =>
                    setStage((prevStage) => ({
                      ...prevStage,
                      repository_action_branch: e.target.value,
                    }))
                  }
                  readOnly={readOnly}
                  placeholder='main'
                />
              </div>

              {stage.repository_action_type === 'merge' && (
                <>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`repo-action-target-branch-${index}`}>
                      {dict.workflow.pipeline.targetBranch}
                    </Label>
                    <Input
                      id={`repo-action-target-branch-${index}`}
                      value={stage.repository_action_target_branch ?? ''}
                      onChange={(e) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          repository_action_target_branch: e.target.value,
                        }))
                      }
                      readOnly={readOnly}
                      placeholder='staging'
                    />
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`repo-action-merge-strategy-${index}`}>
                      {dict.workflow.pipeline.mergeStrategy}
                    </Label>
                    <Select
                      value={
                        stage.repository_action_merge_strategy ?? 'default'
                      }
                      onValueChange={(value) => {
                        setStage((prevStage) => ({
                          ...prevStage,
                          repository_action_merge_strategy:
                            value === 'default' ? undefined : value,
                        }));
                      }}
                      disabled={readOnly}
                    >
                      <SelectTrigger
                        id={`repo-action-merge-strategy-${index}`}
                        className='w-full'
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='default'>
                          {dict.workflow.pipeline.mergeStrategyDefault}
                        </SelectItem>
                        <SelectItem value='ours'>
                          {dict.workflow.pipeline.mergeStrategyOurs}
                        </SelectItem>
                        <SelectItem value='theirs'>
                          {dict.workflow.pipeline.mergeStrategyTheirs}
                        </SelectItem>
                        <SelectItem value='recursive'>
                          {dict.workflow.pipeline.mergeStrategyRecursive}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div
                    className={`
                      flex items-center space-x-2 rounded-md border p-3
                    `}
                  >
                    <Switch
                      id={`repo-action-squash-${index}`}
                      checked={stage.repository_action_squash ?? false}
                      onCheckedChange={(checked) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          repository_action_squash: checked,
                        }))
                      }
                      disabled={readOnly}
                    />
                    <div className='flex flex-col'>
                      <Label htmlFor={`repo-action-squash-${index}`}>
                        {dict.workflow.pipeline.squashCommits}
                      </Label>
                      <span className='text-xs text-muted-foreground'>
                        {dict.workflow.pipeline.squashCommitsDescription}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`
                      flex items-center space-x-2 rounded-md border p-3
                    `}
                  >
                    <Switch
                      id={`repo-action-allow-empty-${index}`}
                      checked={stage.repository_action_allow_empty ?? false}
                      onCheckedChange={(checked) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          repository_action_allow_empty: checked,
                        }))
                      }
                      disabled={readOnly}
                    />
                    <div className='flex flex-col'>
                      <Label htmlFor={`repo-action-allow-empty-${index}`}>
                        {dict.workflow.pipeline.allowEmptyCommits}
                      </Label>
                      <span className='text-xs text-muted-foreground'>
                        {dict.workflow.pipeline.allowEmptyCommitsDescription}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {(stage.repository_action_type === 'commit' ||
                stage.repository_action_type === 'merge') && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`repo-action-commit-message-${index}`}>
                    {dict.workflow.pipeline.commitMessage}
                  </Label>
                  <Input
                    id={`repo-action-commit-message-${index}`}
                    value={stage.repository_action_commit_message ?? ''}
                    onChange={(e) =>
                      setStage((prevStage) => ({
                        ...prevStage,
                        repository_action_commit_message: e.target.value,
                      }))
                    }
                    readOnly={readOnly}
                    placeholder={
                      dict.workflow.pipeline.commitMessagePlaceholder
                    }
                  />
                </div>
              )}

              {stage.repository_action_type === 'revert' && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`repo-action-revert-path-${index}`}>
                    {dict.workflow.pipeline.revertPath}
                  </Label>
                  <Input
                    id={`repo-action-revert-path-${index}`}
                    value={stage.repository_action_revert_path ?? ''}
                    onChange={(e) =>
                      setStage((prevStage) => ({
                        ...prevStage,
                        repository_action_revert_path: e.target.value,
                      }))
                    }
                    readOnly={readOnly}
                    placeholder='/'
                  />
                </div>
              )}

              {stage.repository_action_type === 'delete' && (
                <>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`repo-action-delete-path-${index}`}>
                      {dict.workflow.pipeline.deletePath}
                    </Label>
                    <Input
                      id={`repo-action-delete-path-${index}`}
                      value={stage.repository_action_delete_path ?? ''}
                      onChange={(e) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          repository_action_delete_path: e.target.value,
                        }))
                      }
                      readOnly={readOnly}
                      placeholder='/data/file.csv'
                    />
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label
                      htmlFor={`repo-action-delete-commit-message-${index}`}
                    >
                      {dict.workflow.pipeline.commitMessage}
                    </Label>
                    <Input
                      id={`repo-action-delete-commit-message-${index}`}
                      value={stage.repository_action_commit_message ?? ''}
                      onChange={(e) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          repository_action_commit_message: e.target.value,
                        }))
                      }
                      readOnly={readOnly}
                      placeholder={
                        dict.workflow.pipeline.commitMessagePlaceholder
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}

          {stage.type === 'trigger_workflow' && (
            <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`trigger-workflow-${index}`}>
                  {dict.workflow.workflow}
                </Label>
                <Select
                  value={stage.trigger_workflow_id}
                  onValueChange={(value) => {
                    if (!value) return;
                    setStage((prevStage) => ({
                      ...prevStage,
                      trigger_workflow_id: value,
                    }));
                  }}
                  disabled={readOnly || workflowsQuery.isLoading}
                >
                  <SelectTrigger
                    id={`trigger-workflow-${index}`}
                    className='w-full'
                  >
                    <SelectValue>
                      {workflowsQuery.data?.data?.find(
                        (w) => w.id === stage.trigger_workflow_id
                      )?.name ?? stage.trigger_workflow_id}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {workflowsQuery.data?.data
                      ?.filter((workflow) => workflow.id !== currentWorkflowID)
                      .map((workflow) => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {stage.trigger_workflow_id && (
                  <Button
                    href={`${workspaceUrl}/workflows/${stage.trigger_workflow_id}`}
                    target='_blank'
                    variant='secondary'
                    className='w-full'
                    size={'sm'}
                  >
                    {dict.list.view}
                  </Button>
                )}
              </div>
            </>
          )}

          {stage.type === 'validation' && (
            <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`validation-mode-${index}`}>
                  {dict.workflow.pipeline.validationMode}
                </Label>
                <Select
                  value={stage.validation_mode ?? 'all'}
                  onValueChange={(value: 'single' | 'all') => {
                    setStage((prevStage) => ({
                      ...prevStage,
                      validation_mode: value,
                    }));
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    id={`validation-mode-${index}`}
                    className='w-full'
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='single'>
                      {dict.workflow.pipeline.validationModeSingle}
                    </SelectItem>
                    <SelectItem value='all'>
                      {dict.workflow.pipeline.validationModeAll}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id={`fail-on-error-${index}`}
                  checked={stage.fail_on_error ?? true}
                  onChange={(e) => {
                    setStage((prevStage) => ({
                      ...prevStage,
                      fail_on_error: e.target.checked,
                    }));
                  }}
                  disabled={readOnly}
                  className='size-4'
                />
                <Label htmlFor={`fail-on-error-${index}`}>
                  {dict.workflow.pipeline.failOnError}
                </Label>
              </div>

              {stage.validation_mode === 'single' && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`validation-target-${index}`}>
                    {dict.workflow.pipeline.validationTargetName}
                  </Label>
                  <input
                    type='text'
                    id={`validation-target-${index}`}
                    placeholder={
                      dict.workflow.pipeline.validationTargetNamePlaceholder
                    }
                    value={stage.validation_target_name || ''}
                    onChange={(e) => {
                      setStage((prevStage) => ({
                        ...prevStage,
                        validation_target_name: e.target.value,
                      }));
                    }}
                    disabled={readOnly}
                    className={`
                      w-full rounded-md border border-input bg-background px-3
                      py-2 text-sm
                    `}
                  />
                </div>
              )}

              <div className='flex flex-col gap-2'>
                <Label>{dict.workflow.pipeline.validationSchema}</Label>
                <div
                  className={`rounded-md border border-input bg-background p-3`}
                >
                  <ObjectSchemaBuilder
                    value={stage.validation_schema}
                    onChange={(newSchema) =>
                      setStage((prevStage) => ({
                        ...prevStage,
                        validation_schema: newSchema,
                      }))
                    }
                    disabled={readOnly}
                    allowedTypes={['structured']}
                  />
                </div>
              </div>
            </>
          )}

          {stage.type === 'transform' && (
            <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`transform-operation-${index}`}>
                  {dict.workflow.pipeline.transformOperation}
                </Label>
                <Select
                  value={stage.transform_operation}
                  onValueChange={(
                    value:
                      | 'field_rename'
                      | 'field_remove'
                      | 'file_rename'
                      | 'file_remove'
                      | 'format_convert'
                  ) => {
                    setStage((prevStage) => {
                      // Type guard to ensure we're working with a transform stage
                      if (prevStage.type !== 'transform') return prevStage;

                      return {
                        ...prevStage,
                        transform_operation: value,
                        // Preserve all operation-specific fields regardless of current operation
                        // This allows users to switch between operations without losing their work
                      };
                    });
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    id={`transform-operation-${index}`}
                    className='w-full'
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='field_rename'>
                      {dict.workflow.pipeline.transformFieldRename}
                    </SelectItem>
                    <SelectItem value='field_remove'>
                      {dict.workflow.pipeline.transformFieldRemove}
                    </SelectItem>
                    <SelectItem value='file_rename'>
                      {dict.workflow.pipeline.transformFileRename}
                    </SelectItem>
                    <SelectItem value='file_remove'>
                      {dict.workflow.pipeline.transformFileRemove}
                    </SelectItem>
                    <SelectItem value='format_convert'>
                      {dict.workflow.pipeline.transformFormatConvert}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex flex-col gap-2'>
                <Label htmlFor={`transform-mode-${index}`}>
                  {dict.workflow.pipeline.transformMode}
                </Label>
                <Select
                  value={stage.transform_mode ?? 'all'}
                  onValueChange={(value: 'single' | 'all') => {
                    setStage((prevStage) => {
                      if (prevStage.type !== 'transform') return prevStage;
                      return {
                        ...prevStage,
                        transform_mode: value,
                      };
                    });
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    id={`transform-mode-${index}`}
                    className='w-full'
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='single'>
                      {dict.workflow.pipeline.transformModeSingle}
                    </SelectItem>
                    <SelectItem value='all'>
                      {dict.workflow.pipeline.transformModeAll}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {stage.transform_mode === 'single' && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`transform-target-${index}`}>
                    {dict.workflow.pipeline.transformTargetName}
                  </Label>
                  <Input
                    id={`transform-target-${index}`}
                    placeholder={
                      dict.workflow.pipeline.transformTargetNamePlaceholder
                    }
                    value={stage.transform_target_name || ''}
                    onChange={(e) => {
                      setStage((prevStage) => {
                        if (prevStage.type !== 'transform') return prevStage;
                        return {
                          ...prevStage,
                          transform_target_name: e.target.value,
                        };
                      });
                    }}
                    readOnly={readOnly}
                  />
                </div>
              )}

              {stage.transform_operation === 'field_rename' && (
                <div className='flex flex-col gap-2'>
                  <Label>{dict.workflow.pipeline.transformFieldRenames}</Label>
                  <div className='flex flex-col gap-2'>
                    {(stage.transform_field_renames || []).map(
                      (rename, renameIndex) => {
                        // Use only the index for a stable key to prevent input loss of focus
                        const itemKey = `rename-${renameIndex}`;
                        return (
                          <div
                            key={itemKey}
                            className='flex items-center gap-2'
                          >
                            <Input
                              placeholder={
                                dict.workflow.pipeline.transformOldFieldName
                              }
                              value={rename.old_name}
                              onChange={(e) => {
                                if (stage.type !== 'transform') return;
                                const newValue = e.target.value;
                                setStage((prevStage) => {
                                  if (prevStage.type !== 'transform')
                                    return prevStage;
                                  const newRenames = [
                                    ...(prevStage.transform_field_renames ||
                                      []),
                                  ];
                                  newRenames[renameIndex] = {
                                    ...newRenames[renameIndex],
                                    old_name: newValue,
                                  };
                                  return {
                                    ...prevStage,
                                    transform_field_renames: newRenames,
                                  };
                                });
                              }}
                              readOnly={readOnly}
                              className='flex-1'
                            />
                            <span className='text-muted-foreground'>→</span>
                            <Input
                              placeholder={
                                dict.workflow.pipeline.transformNewFieldName
                              }
                              value={rename.new_name}
                              onChange={(e) => {
                                if (stage.type !== 'transform') return;
                                const newValue = e.target.value;
                                setStage((prevStage) => {
                                  if (prevStage.type !== 'transform')
                                    return prevStage;
                                  const newRenames = [
                                    ...(prevStage.transform_field_renames ||
                                      []),
                                  ];
                                  newRenames[renameIndex] = {
                                    ...newRenames[renameIndex],
                                    new_name: newValue,
                                  };
                                  return {
                                    ...prevStage,
                                    transform_field_renames: newRenames,
                                  };
                                });
                              }}
                              readOnly={readOnly}
                              className='flex-1'
                            />
                            {!readOnly && (
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                onClick={() => {
                                  if (stage.type !== 'transform') return;
                                  setStage((prevStage) => {
                                    if (prevStage.type !== 'transform')
                                      return prevStage;
                                    const newRenames = (
                                      prevStage.transform_field_renames || []
                                    ).filter((_, i) => i !== renameIndex);
                                    return {
                                      ...prevStage,
                                      transform_field_renames: newRenames,
                                    };
                                  });
                                }}
                                className='size-8 shrink-0'
                              >
                                <TbTrash className='size-4' />
                              </Button>
                            )}
                          </div>
                        );
                      }
                    )}
                    {!readOnly && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setStage((prevStage) => {
                            if (prevStage.type !== 'transform')
                              return prevStage;
                            return {
                              ...prevStage,
                              transform_field_renames: [
                                ...(prevStage.transform_field_renames || []),
                                { old_name: '', new_name: '' },
                              ],
                            };
                          });
                        }}
                      >
                        {dict.workflow.pipeline.addFieldRename}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {stage.transform_operation === 'field_remove' && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`transform-fields-remove-${index}`}>
                    {dict.workflow.pipeline.transformFieldsToRemove}
                  </Label>
                  <Input
                    id={`transform-fields-remove-${index}`}
                    placeholder={
                      dict.workflow.pipeline.transformFieldsToRemovePlaceholder
                    }
                    value={(stage.transform_fields_to_remove || []).join(', ')}
                    onChange={(e) => {
                      const fields = e.target.value
                        .split(',')
                        .map((f) => f.trim())
                        .filter((f) => f);
                      setStage((prevStage) => {
                        if (prevStage.type !== 'transform') return prevStage;
                        return {
                          ...prevStage,
                          transform_fields_to_remove: fields,
                        };
                      });
                    }}
                    readOnly={readOnly}
                  />
                  <span className='text-xs text-muted-foreground'>
                    {dict.workflow.pipeline.transformFieldsToRemoveHint}
                  </span>
                </div>
              )}

              {stage.transform_operation === 'file_rename' && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`transform-output-name-${index}`}>
                    {dict.workflow.pipeline.transformOutputName}
                  </Label>
                  <Input
                    id={`transform-output-name-${index}`}
                    placeholder={
                      dict.workflow.pipeline.transformOutputNamePlaceholder
                    }
                    value={stage.transform_output_name || ''}
                    onChange={(e) => {
                      setStage((prevStage) => {
                        if (prevStage.type !== 'transform') return prevStage;
                        return {
                          ...prevStage,
                          transform_output_name: e.target.value,
                        };
                      });
                    }}
                    readOnly={readOnly}
                  />
                </div>
              )}

              {stage.transform_operation === 'format_convert' && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`transform-output-format-${index}`}>
                    {dict.workflow.pipeline.transformOutputFormat}
                  </Label>
                  <Select
                    value={stage.transform_output_format || 'json'}
                    onValueChange={(value: 'csv' | 'json' | 'parquet') => {
                      setStage((prevStage) => {
                        if (prevStage.type !== 'transform') return prevStage;
                        return {
                          ...prevStage,
                          transform_output_format: value,
                        };
                      });
                    }}
                    disabled={readOnly}
                  >
                    <SelectTrigger
                      id={`transform-output-format-${index}`}
                      className='w-full'
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='csv'>CSV</SelectItem>
                      <SelectItem value='json'>JSON</SelectItem>
                      <SelectItem value='parquet'>Parquet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(Stage);
