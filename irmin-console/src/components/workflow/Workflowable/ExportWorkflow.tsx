'use client';

import ConnectionPathSelector from '@/components/connection/ConnectionPathSelector';
import RepositoryPathSelector from '@/components/repository/objects/RepositoryPathSelector';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
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

import useBaseUrl from '@/hooks/useBaseUrl';
import { useConnections } from '@/hooks/useConnections';
import { useRepositories } from '@/hooks/useRepositories';

import { Export } from '@/types/core/Workflow';
import { WorkflowRequest } from '@/types/internal/WorkflowInput';

interface ExportWorkflowProps {
  workflowable: Export;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowRequest>>;
}

export default function ExportWorkflow({
  workflowable,
  setWorkflowData,
}: ExportWorkflowProps) {
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
        <Label>{dict.workflow.exportDestinationConnection}</Label>
        <Select
          value={workflowable.connection_id}
          onValueChange={(value) => {
            if (!value) return;
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Export),
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
        <div className='flex flex-col gap-2'>
          <Label>{dict.workflow.exportDestinationConnectionPath}</Label>
          <ConnectionPathSelector
            connectionId={workflowable.connection_id}
            defaultPath={workflowable.export_to_connection_path ?? ''}
            operationMethod={'push'}
            onPathChange={(path) =>
              setWorkflowData((prev) => ({
                ...prev,
                workflowable: {
                  ...(prev.workflowable as Export),
                  export_to_connection_path: path,
                },
              }))
            }
          />
        </div>
      )}
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.exportSourceRepository}</Label>
        <Select
          value={workflowable.repository}
          onValueChange={(value) => {
            if (!value) return;
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Export),
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
        <Label>{dict.workflow.exportSourceBranch}</Label>
        <Input
          required
          type='text'
          defaultValue={workflowable.repository_branch ?? ''}
          onChange={(e) =>
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Export),
                repository_branch: e.target.value,
              },
            }))
          }
        />
      </div>
      {workflowable.repository && workflowable.repository_branch && (
        <MultiplePathsSelector
          label={dict.workflow.exportSourcePath}
          paths={workflowable.export_from_repository_paths}
          onPathsChange={(paths) =>
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Export),
                export_from_repository_paths: paths,
              },
            }))
          }
          renderPathSelector={(path, onPathChange) => (
            <RepositoryPathSelector
              repositorySlug={workflowable.repository}
              ref={workflowable.repository_branch}
              defaultPath={path}
              onPathChange={onPathChange}
              defaultExpanded={path === ''}
            />
          )}
        />
      )}
    </>
  );
}
