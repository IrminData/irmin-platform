'use client';

import ConnectionPathSelector from '@/components/connection/ConnectionPathSelector';
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
import MultiplePathsSelector from '@/components/workflow/MultiplePathsSelector';

import { useLocale } from '@/context/LocaleContext';

import { useConnections, useRepositories } from '@/hooks/api';
import { useBaseUrl } from '@/hooks/utils';

import type { Import, SyncMode } from '@/types/core/Workflow';
import type { WorkflowRequest } from '@/types/internal/WorkflowInput';

interface ImportWorkflowProps {
  workflowable: Import;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowRequest>>;
}

export default function ImportWorkflow({
  workflowable,
  setWorkflowData,
}: ImportWorkflowProps) {
  const { dict } = useLocale();

  const { connectionsQuery } = useConnections();
  const { repositoriesQuery } = useRepositories();

  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <>
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.importSourceConnection}</Label>
        <Select
          value={workflowable.connection_id}
          onValueChange={(value) => {
            if (!value) return;
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Import),
                connection_id: value,
              },
            }));
          }}
          disabled={connectionsQuery.isLoading}
        >
          <SelectTrigger className='w-full'>
            <SelectValue>
              {connectionsQuery.data?.data?.find(
                (conn) => workflowable.connection_id === conn.id
              )?.name ?? workflowable.connection_id}
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
        {workflowable.connection_id && (
          <Button
            href={`${workspaceUrl}/connections/${workflowable.connection_id}`}
            target='_blank'
            variant='secondary'
            className='w-full'
            size={'sm'}
          >
            {dict.list.view}
          </Button>
        )}
        <Button
          href={`${workspaceUrl}/connections?create`}
          target='_blank'
          variant='gray'
          className='w-full'
          size={'sm'}
        >
          {dict.consoleNavigation.staticSearchItems.createConnection}
        </Button>
      </div>
      {workflowable.connection_id && (
        <MultiplePathsSelector
          label={dict.workflow.importSourceConnectionPath}
          paths={workflowable.import_from_connection_paths}
          onPathsChange={(paths) =>
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Import),
                import_from_connection_paths: paths,
              },
            }))
          }
          renderPathSelector={(path, onPathChange) => (
            <ConnectionPathSelector
              connectionId={workflowable.connection_id}
              defaultPath={path}
              operationMethod={'pull'}
              onPathChange={onPathChange}
            />
          )}
        />
      )}
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.importDestinationRepository}</Label>
        <Select
          value={workflowable.repository}
          onValueChange={(value) => {
            if (!value) return;
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Import),
                repository: value,
                repository_branch:
                  repositoriesQuery.data?.data?.find(
                    (repo) => repo.slug === value
                  )?.default_branch ??
                  workflowable.repository_branch ??
                  '',
              },
            }));
          }}
          disabled={repositoriesQuery.isLoading}
        >
          <SelectTrigger className='w-full'>
            <SelectValue>
              {repositoriesQuery.data?.data?.find(
                (repo) => workflowable.repository === repo.slug
              )?.name ?? workflowable.repository}
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
        {workflowable.repository && (
          <Button
            href={`${workspaceUrl}/repositories/${workflowable.repository}?ref=${workflowable.repository_branch}`}
            target='_blank'
            variant='secondary'
            className='w-full'
            size={'sm'}
          >
            {dict.list.view}
          </Button>
        )}
        <Button
          href={`${workspaceUrl}/repositories?create`}
          target='_blank'
          variant='gray'
          className='w-full'
          size={'sm'}
        >
          {dict.consoleNavigation.staticSearchItems.createRepository}
        </Button>
      </div>
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.importDestinationBranch}</Label>
        <Input
          required
          type='text'
          defaultValue={workflowable.repository_branch ?? ''}
          onChange={(e) =>
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Import),
                repository_branch: e.target.value,
              },
            }))
          }
        />
      </div>
      {workflowable.repository && workflowable.repository_branch && (
        <div className='flex flex-col gap-2'>
          <Label>{dict.workflow.importDestinationPath}</Label>
          <RepositoryPathSelector
            repositorySlug={workflowable.repository}
            repositoryRef={workflowable.repository_branch}
            defaultPath={workflowable.import_to_repository_path}
            onPathChange={(path) =>
              setWorkflowData((prev) => ({
                ...prev,
                workflowable: {
                  ...(prev.workflowable as Import),
                  import_to_repository_path: path,
                },
              }))
            }
            defaultExpanded={true}
          />
        </div>
      )}
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.syncMode}</Label>
        <Select
          value={workflowable.sync_mode ?? 'auto'}
          onValueChange={(value) => {
            if (!value) return;
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Import),
                sync_mode: value as SyncMode,
              },
            }));
          }}
        >
          <SelectTrigger className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='auto'>{dict.workflow.syncModeAuto}</SelectItem>
            <SelectItem value='full'>{dict.workflow.syncModeFull}</SelectItem>
            <SelectItem value='patch'>{dict.workflow.syncModePatch}</SelectItem>
          </SelectContent>
        </Select>
        <p className='text-xs text-muted-foreground'>
          {dict.workflow.syncModeDescription}
        </p>
      </div>
    </>
  );
}
