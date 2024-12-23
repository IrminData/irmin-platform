'use client';

import ReactSelect from 'react-select';

import FileSelector from '@/components/editor/FileSelector';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useConfigureWorkflowable } from '@/hooks/useCreateWorkflow';

import { Connection } from '@/types/core/Connection';
import { EditorItems } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import { WorkflowSetup } from '@/types/internal/WorkflowSetup';

import PipelineStageEditor from '../PipelineStageEditor';

/**
 * Configure workflow type specific properties
 *
 * @param props - Component properties
 * @param props.editorItems - List of editor items
 * @param props.connections - List of connections
 * @param props.repositories - List of repositories
 * @param props.workflowData - Workflow setup data
 * @param props.setWorkflowData - Function to set the workflow setup data
 * @param props.setCurrentStep - Function to set the current step
 */
export default function ConfigureWorkflowable({
  editorItems,
  connections,
  repositories,
  workflowData,
  setWorkflowData,
  setCurrentStep,
}: {
  editorItems: EditorItems;
  connections: Connection[];
  repositories: Repository[];
  workflowData: WorkflowSetup;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { dict } = useLocale();
  const { handleContinue } = useConfigureWorkflowable(
    workflowData,
    setCurrentStep
  );

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        {workflowData.type === 'action' && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.executableScriptFile}</Label>
              <FileSelector
                editorItems={editorItems}
                currentSelectedFile={workflowData.executable ?? null}
                onSelectFile={(filePath) =>
                  setWorkflowData({
                    ...workflowData,
                    executable: filePath,
                  })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.scriptResultDestinationRepository}</Label>
              <ReactSelect
                value={{
                  value: workflowData.repository?.slug ?? '',
                  label: workflowData.repository?.name ?? '',
                }}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    repository:
                      repositories.find(
                        (repo) => repo.slug === newValue.value
                      ) ?? null,
                  });
                }}
                options={repositories.map((repo) => ({
                  value: repo.slug,
                  label: repo.name,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
              {workflowData.repository && (
                <Button
                  href={`${workspaceUrl}/repositories/${workflowData.repository.slug}?ref=${workflowData.branch}`}
                  target='_blank'
                  variant='secondary'
                  className='w-full'
                  size={'sm'}
                >
                  {dict.list.view}
                </Button>
              )}
              <Button
                href={`${workspaceUrl}/repositories/create`}
                target='_blank'
                variant='gray'
                className='w-full'
                size={'sm'}
              >
                {dict.consoleNavigation.staticSearchItems.createRepository}
              </Button>
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.scriptResultDestinationBranch}</Label>
              <Input
                required
                type='text'
                defaultValue={workflowData.branch ?? ''}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    branch: e.target.value,
                  })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.scriptResultDestinationPath}</Label>
              <Input
                required
                type='text'
                defaultValue={workflowData.path ?? '/'}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    path: e.target.value,
                  })
                }
              />
            </div>
          </>
        )}
        {workflowData.type === 'import' && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.importSourceConnection}</Label>
              <ReactSelect
                value={{
                  value: workflowData.connection?.id ?? '',
                  label: workflowData.connection?.name ?? '',
                }}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    connection:
                      connections.find((conn) => conn.id === newValue.value) ??
                      null,
                  });
                }}
                options={connections.map((conn) => ({
                  value: conn.id,
                  label: conn.name,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
              {workflowData.connection && (
                <Button
                  href={`${workspaceUrl}/connections/${workflowData.connection}`}
                  target='_blank'
                  variant='secondary'
                  className='w-full'
                  size={'sm'}
                >
                  {dict.list.view}
                </Button>
              )}
              <Button
                href={`${workspaceUrl}/connections/create`}
                target='_blank'
                variant='gray'
                className='w-full'
                size={'sm'}
              >
                {dict.consoleNavigation.staticSearchItems.createConnection}
              </Button>
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.importDestinationRepository}</Label>
              <ReactSelect
                value={{
                  value: workflowData.repository?.slug ?? '',
                  label: workflowData.repository?.name ?? '',
                }}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    repository:
                      repositories.find(
                        (repo) => repo.slug === newValue.value
                      ) ?? null,
                  });
                }}
                options={repositories.map((repo) => ({
                  value: repo.slug,
                  label: repo.name,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
              {workflowData.repository && (
                <Button
                  href={`${workspaceUrl}/repositories/${workflowData.repository.slug}?ref=${workflowData.branch}`}
                  target='_blank'
                  variant='secondary'
                  className='w-full'
                  size={'sm'}
                >
                  {dict.list.view}
                </Button>
              )}
              <Button
                href={`${workspaceUrl}/repositories/create`}
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
                defaultValue={workflowData.branch ?? ''}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    branch: e.target.value,
                  })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.importDestinationPath}</Label>
              <Input
                required
                type='text'
                defaultValue={workflowData.path ?? '/'}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    path: e.target.value,
                  })
                }
              />
            </div>
          </>
        )}
        {workflowData.type === 'export' && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportDestinationConnection}</Label>
              <ReactSelect
                value={{
                  value: workflowData.connection?.id ?? '',
                  label: workflowData.connection?.name ?? '',
                }}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    connection:
                      connections.find((conn) => conn.id === newValue.value) ??
                      null,
                  });
                }}
                options={connections.map((conn) => ({
                  value: conn.id,
                  label: conn.name,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportSourceRepository}</Label>
              <ReactSelect
                value={{
                  value: workflowData.repository?.slug ?? '',
                  label: workflowData.repository?.name ?? '',
                }}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    repository:
                      repositories.find(
                        (repo) => repo.slug === newValue.value
                      ) ?? null,
                  });
                }}
                options={repositories.map((repo) => ({
                  value: repo.slug,
                  label: repo.name,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
              {workflowData.repository && (
                <Button
                  href={`${workspaceUrl}/repositories/${workflowData.repository.slug}?ref=${workflowData.branch}`}
                  target='_blank'
                  variant='secondary'
                  className='w-full'
                  size={'sm'}
                >
                  {dict.list.view}
                </Button>
              )}
              <Button
                href={`${workspaceUrl}/repositories/create`}
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
                defaultValue={workflowData.branch ?? ''}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    branch: e.target.value,
                  })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportSourcePath}</Label>
              <Input
                required
                type='text'
                defaultValue={workflowData.path ?? '/'}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    path: e.target.value,
                  })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportRecursive}</Label>
              <ReactSelect
                value={
                  workflowData.recursive
                    ? { value: true, label: dict.common.yes }
                    : { value: false, label: dict.common.no }
                }
                onChange={(newValue) => {
                  setWorkflowData({
                    ...workflowData,
                    recursive: newValue ? newValue.value : false,
                  });
                }}
                options={[
                  {
                    value: true,
                    label: dict.common.yes,
                  },
                  {
                    value: false,
                    label: dict.common.no,
                  },
                ]}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
            </div>
          </>
        )}
        {workflowData.type === 'pipeline' && (
          <>
            <PipelineStageEditor
              initialStages={workflowData.stages}
              editorItems={editorItems}
              repositories={repositories}
              connections={connections}
              onSubmit={(data) => {
                setWorkflowData({
                  ...workflowData,
                  stages: data.stages,
                });
              }}
              readOnly={false}
              hideSaveButton={true}
            />
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.pipeline.livePipeline}</Label>
              <Switch
                checked={workflowData.live ?? false}
                onCheckedChange={(checked) =>
                  setWorkflowData({
                    ...workflowData,
                    live: checked,
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
          variant='default'
          size={'lg'}
          onClick={handleContinue}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
      </div>
    </div>
  );
}
