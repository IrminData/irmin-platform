'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';

import { TbChevronDown, TbChevronRight } from 'react-icons/tb';

import IrminCore from '@/lib/core';

import ConnectionPathSelector from '@/components/connection/ConnectionPathSelector';
import FileSelector from '@/components/editor/FileSelector';
import RepositoryPathSelector from '@/components/repository/objects/RepositoryPathSelector';
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

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useConnections } from '@/hooks/useConnections';
import { useRepositories } from '@/hooks/useRepositories';

import { ObjectSchema } from '@/types/core/ObjectSchema';
import { PipelineStageInput } from '@/types/internal/WorkflowInput';

const defaultStage: PipelineStageInput = {
  type: 'action',
  executable: '',
  description: '',
  write: false,
  read: false,
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
}: {
  index: number;
  initialStage?: PipelineStageInput;
  updateStage: (stage: PipelineStageInput) => void;
  moveStageUp?: () => void;
  moveStageDown?: () => void;
  removeStage?: () => void;
  readOnly: boolean;
  defaultCollapsed?: boolean;
}) {
  const { connectionsQuery } = useConnections();
  const { repositoriesQuery } = useRepositories();
  const { workspaceSlug } = useWorkspaceContext();
  const { getToken } = useIAM();
  const { dict, locale } = useLocale();

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed ?? false);
  const [stage, setStage] = useState<PipelineStageInput>(
    initialStage ?? defaultStage
  );
  const prevStageRef = useRef<PipelineStageInput>(stage);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced update function
  const debouncedUpdate = useCallback(
    (newStage: PipelineStageInput) => {
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
    setStage(newStage);
    prevStageRef.current = newStage;
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
        const [newPushSchema, newPullSchema] = await Promise.all([
          irminCore.connectionService.fetchConnectionSchema({
            workspace: workspaceSlug,
            connectionID: connectionId,
            operationMethod: 'push',
          }),
          irminCore.connectionService.fetchConnectionSchema({
            workspace: workspaceSlug,
            connectionID: connectionId,
            operationMethod: 'pull',
          }),
        ]);
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

  return (
    <div className='border-foreground/20 space-y-4 rounded-lg border p-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => setIsCollapsed(!isCollapsed)}
            className='h-6 w-6'
          >
            {isCollapsed ? (
              <TbChevronRight className='h-4 w-4' />
            ) : (
              <TbChevronDown className='h-4 w-4' />
            )}
          </Button>
          <h3 className='flex items-center gap-2 text-lg font-semibold'>
            {dict.workflow.pipeline.stage} {index + 1}
            <span className='text-muted-foreground text-sm'>
              {stage.type === 'action' && (
                <span className='text-muted-foreground text-xs'>
                  {dict.workflow.action}
                  {stage.description ? `: ${stage.description}` : ''}
                </span>
              )}
              {stage.type === 'connection' && (
                <span className='text-muted-foreground text-xs'>
                  {dict.connections.connection}
                  {stage.description ? `: ${stage.description}` : ''}
                </span>
              )}
              {stage.type === 'repository' && (
                <span className='text-muted-foreground text-xs'>
                  {dict.repository.repository}
                  {stage.description ? `: ${stage.description}` : ''}
                </span>
              )}
            </span>
          </h3>
        </div>
        {!readOnly && (
          <div className='space-x-2'>
            {moveStageUp && (
              <Button
                type='button'
                onClick={() => moveStageUp()}
                variant='outline'
              >
                {dict.workflow.pipeline.moveUp}
              </Button>
            )}
            {moveStageDown && (
              <Button
                type='button'
                onClick={() => moveStageDown()}
                variant='outline'
              >
                {dict.workflow.pipeline.moveDown}
              </Button>
            )}
            {removeStage && (
              <Button
                type='button'
                onClick={() => removeStage()}
                variant='destructive'
              >
                {dict.common.remove}
              </Button>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
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

          <div className='flex items-center space-x-2'>
            <Switch
              id={`write-${index}`}
              checked={stage.write}
              onCheckedChange={(checked) =>
                setStage((prevStage) => ({
                  ...prevStage,
                  write: checked,
                }))
              }
              disabled={readOnly}
            />
            <Label htmlFor={`write-${index}`}>
              {dict.workflow.pipeline.write}
            </Label>
          </div>

          <div className='flex items-center space-x-2'>
            <Switch
              id={`read-${index}`}
              checked={stage.read}
              onCheckedChange={(checked) =>
                setStage((prevStage) => ({
                  ...prevStage,
                  read: checked,
                }))
              }
              disabled={readOnly}
            />
            <Label htmlFor={`read-${index}`}>
              {dict.workflow.pipeline.read}
            </Label>
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor={`type-select-${index}`}>
              {dict.repository.objects.type}
            </Label>
            <Select
              value={stage.type}
              onValueChange={(value) => {
                if (value === 'action') {
                  setStage((prevStage) => ({
                    ...prevStage,
                    type: 'action',
                    executable: '',
                  }));
                } else if (value === 'connection') {
                  setStage((prevStage) => ({
                    ...prevStage,
                    type: 'connection',
                    connection: '',
                    connection_write_path: '',
                    connection_read_path: '',
                  }));
                } else if (value === 'repository') {
                  setStage((prevStage) => ({
                    ...prevStage,
                    type: 'repository',
                    repository: '',
                    branch: '',
                    path: '',
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
              </SelectContent>
            </Select>
          </div>

          {stage.type === 'action' && (
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`executable-${index}`}>
                {dict.workflow.pipeline.executablePath}
              </Label>
              {!readOnly ? (
                <FileSelector
                  currentSelectedFile={stage.executable ?? null}
                  onSelectFile={(filePath) =>
                    setStage((prevStage) => ({
                      ...prevStage,
                      executable: filePath,
                    }))
                  }
                />
              ) : (
                <div className='flex flex-col gap-2'>
                  <Input
                    id={`executable-${index}`}
                    placeholder={
                      dict.workflow.pipeline.executablePathDescription
                    }
                    value={stage.executable}
                    onChange={(e) =>
                      setStage((prevStage) => ({
                        ...prevStage,
                        executable: e.target.value,
                      }))
                    }
                    readOnly={readOnly}
                  />
                  <Button
                    href={`${workspaceUrl}/editor?path=${stage.executable}`}
                    target='_blank'
                    variant='secondary'
                    className='w-full'
                  >
                    {dict.workflow.openInEditor}
                  </Button>
                </div>
              )}
            </div>
          )}

          {stage.type === 'connection' && (
            <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`connection-select-${index}`}>
                  {dict.connections.connection}
                </Label>
                <Select
                  value={stage.connection}
                  onValueChange={(value) => {
                    if (!value) return;
                    fetchConnectionSchemas(value);
                    setStage((prevStage) => ({
                      ...prevStage,
                      connection: value,
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
                        (c) => c.id === stage.connection
                      )?.name ?? stage.connection}
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
                {stage.connection && (
                  <Button
                    href={`${workspaceUrl}/connections/${stage.connection}`}
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
              {stage.connection && stage.write && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`connection_write_path-${index}`}>
                    {dict.workflow.pipeline.connectionWritePath}
                  </Label>
                  {!readOnly && connectionPushSchema ? (
                    <ConnectionPathSelector
                      rootSchema={connectionPushSchema}
                      connectionId={stage.connection}
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
                      readOnly={readOnly || !stage.connection}
                    />
                  )}
                </div>
              )}
              {stage.connection && stage.read && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`connection_read_path-${index}`}>
                    {dict.workflow.pipeline.connectionReadPath}
                  </Label>
                  {!readOnly && connectionPullSchema ? (
                    <ConnectionPathSelector
                      rootSchema={connectionPullSchema}
                      connectionId={stage.connection}
                      defaultPath={stage.connection_read_path ?? ''}
                      operationMethod={'pull'}
                      onPathChange={(path) => {
                        setStage((prevStage) => ({
                          ...prevStage,
                          connection_read_path: path,
                        }));
                      }}
                    />
                  ) : (
                    <Input
                      id={`connection_read_path-${index}`}
                      placeholder={
                        dict.workflow.pipeline.connectionReadPathDescription
                      }
                      value={stage.connection_read_path}
                      onChange={(e) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          connection_read_path: e.target.value,
                        }))
                      }
                      readOnly={readOnly || !stage.connection}
                    />
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
                  value={stage.branch}
                  onChange={(e) =>
                    setStage((prevStage) => ({
                      ...prevStage,
                      branch: e.target.value,
                    }))
                  }
                  readOnly={readOnly || !stage.repository}
                />
              </div>
              {readOnly ? (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`path-${index}`}>
                    {dict.repository.objects.path}
                  </Label>
                  <Input
                    id={`path-${index}`}
                    value={stage.path}
                    onChange={(e) =>
                      setStage((prevStage) => ({
                        ...prevStage,
                        path: e.target.value,
                      }))
                    }
                    readOnly={readOnly}
                  />
                </div>
              ) : (
                stage.repository &&
                stage.branch && (
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`path-${index}`}>
                      {dict.repository.objects.path}
                    </Label>
                    <RepositoryPathSelector
                      repositorySlug={stage.repository}
                      ref={stage.branch}
                      defaultPath={stage.path}
                      onPathChange={(path) =>
                        setStage((prevStage) => ({
                          ...prevStage,
                          path: path,
                        }))
                      }
                    />
                  </div>
                )
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default React.memo(Stage);
