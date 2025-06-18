'use client';

import { memo, useCallback, useMemo } from 'react';

import ConnectionPathSelector from '@/components/connection/ConnectionPathSelector';
import FileSelector from '@/components/editor/FileSelector';
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
import { Switch } from '@/components/ui/switch';
import ActionInputEditor from '@/components/workflow/ActionInputEditor';
import PipelineStageEditor from '@/components/workflow/PipelineStageEditor';

import { useCreateWorkflow } from '@/context/CreateWorkflowContext';
import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useConnections } from '@/hooks/useConnections';
import { useRepositories } from '@/hooks/useRepositories';

import { ActionInputData } from '@/types/core/Workflow';
import {
  ActionWorkflowableInput,
  ExportWorkflowableInput,
  ImportWorkflowableInput,
  PipelineStageInput,
  PipelineWorkflowableInput,
} from '@/types/internal/WorkflowInput';

/**
 * Configure workflow type specific properties
 *
 * @param props - Component properties
 * @param props.setCurrentStep - Function to set the current step
 */
function ConfigureWorkflowable({
  setCurrentStep,
}: {
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { connectionsQuery } = useConnections();
  const { repositoriesQuery } = useRepositories();
  const { workflowData, setWorkflowData } = useCreateWorkflow();
  const { dict } = useLocale();

  const workflowable = useMemo(() => workflowData.workflowable, [workflowData]);

  const handleInputFilesChange = useCallback(
    (inputFiles: ActionInputData[]) => {
      setWorkflowData((prev) => ({
        ...prev,
        workflowable: {
          ...(prev.workflowable as ActionWorkflowableInput),
          input: inputFiles,
        },
      }));
    },
    [setWorkflowData]
  );

  const handlePipelineStagesSubmit = useCallback(
    (stages: PipelineStageInput[]) => {
      setWorkflowData({
        ...workflowData,
        workflowable: {
          ...(workflowable as PipelineWorkflowableInput),
          stages,
        },
      });
    },
    [setWorkflowData, workflowData, workflowable]
  );

  const handleNextStep = useCallback(() => {
    setCurrentStep(2);
  }, [setCurrentStep]);

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // Early return if workflowable is not defined
  if (!workflowable) {
    return <></>;
  }

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        {workflowable.type === 'action' && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.executableScriptFile}</Label>
              <FileSelector
                currentSelectedFile={
                  (workflowable as ActionWorkflowableInput).executable ?? null
                }
                onSelectFile={(filePath) =>
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ActionWorkflowableInput),
                      executable: filePath,
                    },
                  })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.scriptResultDestinationRepository}</Label>
              <Select
                value={(workflowable as ActionWorkflowableInput).repository}
                onValueChange={(value) => {
                  if (!value) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ActionWorkflowableInput),
                      repository: value,
                      branch:
                        repositoriesQuery.data?.data?.find(
                          (repo) => repo.slug === value
                        )?.default_branch ??
                        (workflowable as ActionWorkflowableInput).branch ??
                        '',
                    },
                  });
                }}
                disabled={repositoriesQuery.isLoading}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {repositoriesQuery.data?.data?.find(
                      (repo) =>
                        (workflowable as ActionWorkflowableInput).repository ===
                        repo.slug
                    )?.name ??
                      (workflowable as ActionWorkflowableInput).repository}
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
              {(workflowable as ActionWorkflowableInput).repository && (
                <Button
                  href={`${workspaceUrl}/repositories/${(workflowable as ActionWorkflowableInput).repository}?ref=${(workflowable as ActionWorkflowableInput).branch}`}
                  target='_blank'
                  variant='secondary'
                  className='w-full'
                >
                  {dict.list.view}
                </Button>
              )}
              <Button
                href={`${workspaceUrl}/repositories?create`}
                target='_blank'
                variant='gray'
                className='w-full'
              >
                {dict.consoleNavigation.staticSearchItems.createRepository}
              </Button>
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.scriptResultDestinationBranch}</Label>
              <Input
                required
                type='text'
                defaultValue={
                  (workflowable as ActionWorkflowableInput).branch ?? ''
                }
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ActionWorkflowableInput),
                      branch: e.target.value,
                    },
                  })
                }
              />
            </div>
            {(workflowable as ActionWorkflowableInput).repository &&
              (workflowable as ActionWorkflowableInput).branch && (
                <div className='flex flex-col gap-2'>
                  <Label>{dict.workflow.scriptResultDestinationPath}</Label>
                  <RepositoryPathSelector
                    repositorySlug={
                      (workflowable as ActionWorkflowableInput).repository!
                    }
                    ref={(workflowable as ActionWorkflowableInput).branch!}
                    defaultPath={(workflowable as ActionWorkflowableInput).path}
                    onPathChange={(path) =>
                      setWorkflowData({
                        ...workflowData,
                        workflowable: {
                          ...(workflowable as ActionWorkflowableInput),
                          path: path,
                        },
                      })
                    }
                    defaultExpanded={true}
                  />
                </div>
              )}
            <div className='flex flex-col gap-2'>
              <ActionInputEditor
                initialData={
                  (workflowable as ActionWorkflowableInput).input ?? []
                }
                onChange={handleInputFilesChange}
                disableSaveButton={true}
              />
            </div>
          </>
        )}
        {workflowable.type === 'import' && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.importSourceConnection}</Label>
              <Select
                value={(workflowable as ImportWorkflowableInput).connection}
                onValueChange={(value) => {
                  if (!value) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ImportWorkflowableInput),
                      connection: value,
                    },
                  });
                }}
                disabled={connectionsQuery.isLoading}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {connectionsQuery.data?.data?.find(
                      (conn) =>
                        (workflowable as ImportWorkflowableInput).connection ===
                        conn.id
                    )?.name ??
                      (workflowable as ImportWorkflowableInput).connection}
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
              {(workflowable as ImportWorkflowableInput).connection && (
                <Button
                  href={`${workspaceUrl}/connections/${(workflowable as ImportWorkflowableInput).connection}`}
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
            {(workflowable as ImportWorkflowableInput).connection && (
              <div className='flex flex-col gap-2'>
                <Label>{dict.workflow.importSourceConnectionPath}</Label>
                <ConnectionPathSelector
                  connectionId={
                    (workflowable as ImportWorkflowableInput).connection
                  }
                  defaultPath={
                    (workflowable as ImportWorkflowableInput).connection_path ??
                    ''
                  }
                  operationMethod={'pull'}
                  onPathChange={(path) =>
                    setWorkflowData({
                      ...workflowData,
                      workflowable: {
                        ...(workflowable as ImportWorkflowableInput),
                        connection_path: path,
                      },
                    })
                  }
                />
              </div>
            )}
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.importDestinationRepository}</Label>
              <Select
                value={(workflowable as ImportWorkflowableInput).repository}
                onValueChange={(value) => {
                  if (!value) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ImportWorkflowableInput),
                      repository: value,
                      branch:
                        repositoriesQuery.data?.data?.find(
                          (repo) => repo.slug === value
                        )?.default_branch ??
                        (workflowable as ImportWorkflowableInput).branch ??
                        '',
                    },
                  });
                }}
                disabled={repositoriesQuery.isLoading}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {repositoriesQuery.data?.data?.find(
                      (repo) =>
                        (workflowable as ImportWorkflowableInput).repository ===
                        repo.slug
                    )?.name ??
                      (workflowable as ImportWorkflowableInput).repository}
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
              {(workflowable as ImportWorkflowableInput).repository && (
                <Button
                  href={`${workspaceUrl}/repositories/${(workflowable as ImportWorkflowableInput).repository}?ref=${(workflowable as ImportWorkflowableInput).branch}`}
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
                defaultValue={
                  (workflowable as ImportWorkflowableInput).branch ?? ''
                }
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ImportWorkflowableInput),
                      branch: e.target.value,
                    },
                  })
                }
              />
            </div>
            {(workflowable as ImportWorkflowableInput).repository &&
              (workflowable as ImportWorkflowableInput).branch && (
                <div className='flex flex-col gap-2'>
                  <Label>{dict.workflow.importDestinationPath}</Label>
                  <RepositoryPathSelector
                    repositorySlug={
                      (workflowable as ImportWorkflowableInput).repository
                    }
                    ref={(workflowable as ImportWorkflowableInput).branch}
                    defaultPath={(workflowable as ImportWorkflowableInput).path}
                    onPathChange={(path) =>
                      setWorkflowData({
                        ...workflowData,
                        workflowable: {
                          ...(workflowable as ImportWorkflowableInput),
                          path: path,
                        },
                      })
                    }
                    defaultExpanded={true}
                  />
                </div>
              )}
          </>
        )}
        {workflowable.type === 'export' && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportDestinationConnection}</Label>
              <Select
                value={(workflowable as ExportWorkflowableInput).connection}
                onValueChange={(value) => {
                  if (!value) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ExportWorkflowableInput),
                      connection: value,
                    },
                  });
                }}
                disabled={connectionsQuery.isLoading}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {connectionsQuery.data?.data?.find(
                      (conn) =>
                        (workflowable as ExportWorkflowableInput).connection ===
                        conn.id
                    )?.name ??
                      (workflowable as ExportWorkflowableInput).connection}
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
              {(workflowable as ExportWorkflowableInput).connection && (
                <Button
                  href={`${workspaceUrl}/connections/${(workflowable as ExportWorkflowableInput).connection}`}
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
            {(workflowable as ExportWorkflowableInput).connection && (
              <div className='flex flex-col gap-2'>
                <Label>{dict.workflow.exportDestinationConnectionPath}</Label>
                <ConnectionPathSelector
                  connectionId={
                    (workflowable as ExportWorkflowableInput).connection
                  }
                  defaultPath={
                    (workflowable as ExportWorkflowableInput).connection_path ??
                    ''
                  }
                  operationMethod={'push'}
                  onPathChange={(path) =>
                    setWorkflowData({
                      ...workflowData,
                      workflowable: {
                        ...(workflowable as ExportWorkflowableInput),
                        connection_path: path,
                      },
                    })
                  }
                />
              </div>
            )}
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportSourceRepository}</Label>
              <Select
                value={(workflowable as ExportWorkflowableInput).repository}
                onValueChange={(value) => {
                  if (!value) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ExportWorkflowableInput),
                      repository: value,
                      branch:
                        repositoriesQuery.data?.data?.find(
                          (repo) => repo.slug === value
                        )?.default_branch ??
                        (workflowable as ExportWorkflowableInput).branch ??
                        '',
                    },
                  });
                }}
                disabled={repositoriesQuery.isLoading}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {repositoriesQuery.data?.data?.find(
                      (repo) =>
                        (workflowable as ExportWorkflowableInput).repository ===
                        repo.slug
                    )?.name ??
                      (workflowable as ExportWorkflowableInput).repository}
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
              {(workflowable as ExportWorkflowableInput).repository && (
                <Button
                  href={`${workspaceUrl}/repositories/${(workflowable as ExportWorkflowableInput).repository}?ref=${(workflowable as ExportWorkflowableInput).branch}`}
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
                defaultValue={
                  (workflowable as ExportWorkflowableInput).branch ?? ''
                }
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ExportWorkflowableInput),
                      branch: e.target.value,
                    },
                  })
                }
              />
            </div>
            {(workflowable as ExportWorkflowableInput).repository &&
              (workflowable as ExportWorkflowableInput).branch && (
                <div className='flex flex-col gap-2'>
                  <Label>{dict.workflow.exportSourcePath}</Label>
                  <RepositoryPathSelector
                    repositorySlug={
                      (workflowable as ExportWorkflowableInput).repository
                    }
                    ref={(workflowable as ExportWorkflowableInput).branch}
                    defaultPath={(workflowable as ExportWorkflowableInput).path}
                    onPathChange={(path) =>
                      setWorkflowData({
                        ...workflowData,
                        workflowable: {
                          ...(workflowable as ExportWorkflowableInput),
                          path: path,
                        },
                      })
                    }
                    defaultExpanded={true}
                  />
                </div>
              )}
          </>
        )}
        {workflowable.type === 'pipeline' && (
          <>
            <PipelineStageEditor
              initialStages={[]}
              onSubmit={handlePipelineStagesSubmit}
              readOnly={false}
              hideSaveButton={true}
              defaultCollapsed={false}
            />
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.pipeline.livePipeline}</Label>
              <Switch
                checked={
                  (workflowable as PipelineWorkflowableInput).live ?? false
                }
                onCheckedChange={(checked) =>
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as PipelineWorkflowableInput),
                      live: checked,
                    },
                  })
                }
              />
            </div>
          </>
        )}
      </div>
      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
        <Button
          className='mb-6 inline-block w-full'
          variant='gradient'
          size={'lg'}
          onClick={handleNextStep}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
      </div>
    </div>
  );
}

export default memo(ConfigureWorkflowable);
