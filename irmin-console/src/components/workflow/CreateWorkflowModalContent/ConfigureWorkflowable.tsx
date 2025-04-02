'use client';

import React, { useCallback, useMemo } from 'react';

import ReactSelect from 'react-select';

import FileSelector from '@/components/editor/FileSelector';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Connection } from '@/types/core/Connection';
import { EditorItem } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import {
  ActionWorkflowableInput,
  ExportWorkflowableInput,
  ImportWorkflowableInput,
  PipelineWorkflowableInput,
  WorkflowInput,
} from '@/types/internal/WorkflowInput';

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
function ConfigureWorkflowable({
  editorItems,
  connections,
  repositories,
  workflowData,
  setWorkflowData,
  setCurrentStep,
}: {
  editorItems: EditorItem[];
  connections: Connection[];
  repositories: Repository[];
  workflowData: WorkflowInput;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowInput>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { dict } = useLocale();

  const handleContinue = useCallback(() => {
    setCurrentStep(2);
  }, [setCurrentStep]);

  const workflowable = useMemo(() => workflowData.workflowable, [workflowData]);

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        {workflowable.type === 'action' && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.executableScriptFile}</Label>
              <FileSelector
                editorItems={editorItems}
                currentSelectedFile={workflowable.executable ?? null}
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
              <ReactSelect
                value={workflowable.repository}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ActionWorkflowableInput),
                      repository: newValue,
                    },
                  });
                }}
                options={repositories.map((repo) => repo.slug)}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
              {workflowable.repository && (
                <Button
                  href={`${workspaceUrl}/repositories/${workflowable.repository}?ref=${workflowable.branch}`}
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
                defaultValue={workflowable.branch ?? ''}
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
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.scriptResultDestinationPath}</Label>
              <Input
                required
                type='text'
                defaultValue={workflowable.path ?? '/'}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ActionWorkflowableInput),
                      path: e.target.value,
                    },
                  })
                }
              />
            </div>
          </>
        )}
        {workflowable.type === 'import' && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.importSourceConnection}</Label>
              <ReactSelect
                value={workflowable.connection}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ImportWorkflowableInput),
                      connection: newValue,
                    },
                  });
                }}
                getOptionLabel={(opt) =>
                  connections.find((c) => c.id === opt)?.name ?? opt
                }
                options={connections.map((conn) => conn.id)}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
              {workflowable.connection && (
                <Button
                  href={`${workspaceUrl}/connections/${workflowable.connection}`}
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
                value={workflowable.repository}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ImportWorkflowableInput),
                      repository: newValue,
                    },
                  });
                }}
                options={repositories.map((repo) => repo.slug)}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
              {workflowable.repository && (
                <Button
                  href={`${workspaceUrl}/repositories/${workflowable.repository}?ref=${workflowable.branch}`}
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
                defaultValue={workflowable.branch ?? ''}
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
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.importDestinationPath}</Label>
              <Input
                required
                type='text'
                defaultValue={workflowable.path ?? '/'}
                onChange={(e) =>
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ImportWorkflowableInput),
                      path: e.target.value,
                    },
                  })
                }
              />
            </div>
          </>
        )}
        {workflowable.type === 'export' && (
          <>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportDestinationConnection}</Label>
              <ReactSelect
                value={workflowable.connection}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ExportWorkflowableInput),
                      connection: newValue,
                    },
                  });
                }}
                getOptionLabel={(opt) =>
                  connections.find((c) => c.id === opt)?.name ?? opt
                }
                options={connections.map((conn) => conn.id)}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportSourceRepository}</Label>
              <ReactSelect
                value={workflowable.repository}
                onChange={(newValue) => {
                  if (!newValue) return;
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ExportWorkflowableInput),
                      repository: newValue,
                    },
                  });
                }}
                options={repositories.map((repo) => repo.slug)}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
              {workflowable.repository && (
                <Button
                  href={`${workspaceUrl}/repositories/${workflowable.repository}?ref=${workflowable.branch}`}
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
                defaultValue={workflowable.branch ?? ''}
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
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportSourcePath}</Label>
              <Input
                required
                type='text'
                defaultValue={workflowable.path ?? '/'}
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
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.exportRecursive}</Label>
              <ReactSelect
                value={
                  workflowable.recursive
                    ? { value: true, label: dict.common.yes }
                    : { value: false, label: dict.common.no }
                }
                onChange={(newValue) =>
                  setWorkflowData({
                    ...workflowData,
                    workflowable: {
                      ...(workflowable as ExportWorkflowableInput),
                      recursive: newValue ? newValue.value : false,
                    },
                  })
                }
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
        {workflowable.type === 'pipeline' && (
          <>
            <PipelineStageEditor
              initialStages={workflowable.stages}
              editorItems={editorItems}
              repositories={repositories}
              connections={connections}
              onSubmit={(data) =>
                setWorkflowData({
                  ...workflowData,
                  workflowable: {
                    ...(workflowable as PipelineWorkflowableInput),
                    stages: data.stages,
                  },
                })
              }
              readOnly={false}
              hideSaveButton={true}
            />
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.pipeline.livePipeline}</Label>
              <Switch
                checked={workflowable.live ?? false}
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

export default React.memo(ConfigureWorkflowable);
