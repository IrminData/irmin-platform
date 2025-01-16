'use client';

import { useEffect } from 'react';

import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import ReactSelect from 'react-select';

import FileSelector from '@/components/editor/FileSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Connection } from '@/types/core/Connection';
import { EditorItems } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import { PipelineStageInput } from '@/types/internal/WorkflowSetup';

type Option = {
  value: 'action' | 'connection' | 'repository';
  label: string;
};

type FormData = {
  stages: PipelineStageInput[];
};

type PipelineStageEditorProps = {
  editorItems?: EditorItems;
  repositories: Repository[];
  connections: Connection[];
  initialStages?: PipelineStageInput[];
  onSubmit?: SubmitHandler<FormData>;
  readOnly?: boolean;
  hideSaveButton?: boolean;
};

/**
 * UI component for editing pipeline stages.
 *
 * @param props - The component props.
 * @param props.initialStages - The initial stages to display.
 * @param props.editorItems - (optional) The editor items to display.
 * @param props.repositories - List of available repositories.
 * @param props.connections - List of available connections.
 * @param props.onSubmit - The function to call when the form is submitted.
 * @param props.readOnly - Whether the form is read-only.
 * @param props.hideSaveButton - Whether to hide the save button.
 *
 * @returns The rendered component.
 */
export default function PipelineStageEditor({
  initialStages = [],
  editorItems,
  repositories,
  connections,
  onSubmit = (data) => console.log(data),
  readOnly = false,
  hideSaveButton = false,
}: PipelineStageEditorProps) {
  const { dict } = useLocale();

  const { register, control, handleSubmit, watch, setValue } =
    useForm<FormData>({
      defaultValues: {
        stages: initialStages,
      },
    });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'stages',
  });

  // Watch for changes and trigger onSubmit if hideSaveButton is true
  useEffect(() => {
    if (hideSaveButton) {
      const subscription = watch((data) => {
        onSubmit({
          stages: data.stages?.filter(
            (stage) => stage !== undefined
          ) as PipelineStageInput[],
        });
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, onSubmit, hideSaveButton]);

  const addStage = () => {
    // Append a new blank stage
    append({
      description: '',
      write: true,
      read: true,
      type: 'action',
      executable: '',
      connection: '',
      connection_write_path: '/',
      connection_read_path: '/',
      repository: '',
      branch: '',
      path: '',
    });
  };

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <div className='space-y-4'>
        {fields.length === 0 && (
          <p className='py-8 text-center text-xl text-foreground/50 lg:text-3xl'>
            {dict.workflow.pipeline.noStages}
          </p>
        )}
        {fields.map((field, index) => {
          const stageType = watch(`stages.${index}.type`);
          const selectedConnection = watch(`stages.${index}.connection`);
          const selectedRepository = watch(`stages.${index}.repository`);
          const currentExecutable = watch(`stages.${index}.executable`);

          return (
            <div
              key={field.id}
              className='space-y-4 rounded-lg border border-foreground/20 p-4'
            >
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold'>
                  {dict.workflow.pipeline.stage} {index + 1}
                </h3>
                {!readOnly && (
                  <div className='space-x-2'>
                    <Button
                      type='button'
                      onClick={() => move(index, Math.max(0, index - 1))}
                      disabled={index === 0}
                      variant='outline'
                    >
                      {dict.workflow.pipeline.moveUp}
                    </Button>
                    <Button
                      type='button'
                      onClick={() =>
                        move(index, Math.min(fields.length - 1, index + 1))
                      }
                      disabled={index === fields.length - 1}
                      variant='outline'
                    >
                      {dict.workflow.pipeline.moveDown}
                    </Button>
                    <Button
                      type='button'
                      onClick={() => remove(index)}
                      variant='destructive'
                    >
                      {dict.common.remove}
                    </Button>
                  </div>
                )}
              </div>

              <div className='flex flex-col gap-2'>
                <Label htmlFor={`description-${index}`}>
                  {dict.common.description}
                </Label>
                <Input
                  id={`description-${index}`}
                  placeholder={dict.workflow.pipeline.descriptionPlaceholder}
                  {...register(`stages.${index}.description`)}
                  readOnly={readOnly}
                />
              </div>

              <div className='flex items-center space-x-2'>
                <Switch
                  id={`write-${index}`}
                  {...register(`stages.${index}.write`)}
                  checked={watch(`stages.${index}.write`)}
                  onCheckedChange={(checked) =>
                    setValue(`stages.${index}.write`, checked)
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
                  {...register(`stages.${index}.read`)}
                  checked={watch(`stages.${index}.read`)}
                  onCheckedChange={(checked) =>
                    setValue(`stages.${index}.read`, checked)
                  }
                  disabled={readOnly}
                />
                <Label htmlFor={`read-${index}`}>
                  {dict.workflow.pipeline.read}
                </Label>
              </div>

              {/* Replaced RadioGroup with ReactSelect for stage type */}
              <div className='flex flex-col gap-2'>
                <Label htmlFor={`type-select-${index}`}>
                  {dict.repository.objects.type}
                </Label>
                <Controller
                  name={`stages.${index}.type`}
                  control={control}
                  render={({ field: typeField }) => (
                    <ReactSelect
                      {...typeField}
                      className='react-select-container'
                      classNamePrefix='react-select'
                      isDisabled={readOnly}
                      options={[
                        { value: 'action', label: dict.workflow.action },
                        {
                          value: 'connection',
                          label: dict.connections.connection,
                        },
                        {
                          value: 'repository',
                          label: dict.repository.repository,
                        },
                      ]}
                      value={
                        [
                          { value: 'action', label: dict.workflow.action },
                          {
                            value: 'connection',
                            label: dict.connections.connection,
                          },
                          {
                            value: 'repository',
                            label: dict.repository.repository,
                          },
                        ].find((option) => option.value === typeField.value) ||
                        null
                      }
                      onChange={(option) => {
                        const val = option
                          ? (option as Option).value
                          : 'action';
                        typeField.onChange(val);
                      }}
                    />
                  )}
                />
              </div>

              {/* Conditional fields based on type */}
              {stageType === 'action' && (
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`executable-${index}`}>
                    {dict.workflow.pipeline.executablePath}
                  </Label>
                  {!readOnly && editorItems ? (
                    <FileSelector
                      editorItems={editorItems}
                      currentSelectedFile={currentExecutable ?? null}
                      onSelectFile={(filePath) =>
                        setValue(`stages.${index}.executable`, filePath)
                      }
                    />
                  ) : (
                    <Input
                      id={`executable-${index}`}
                      placeholder={
                        dict.workflow.pipeline.executablePathDescription
                      }
                      {...register(`stages.${index}.executable`)}
                      readOnly={readOnly}
                    />
                  )}
                </div>
              )}

              {stageType === 'connection' && (
                <>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`connection-select-${index}`}>
                      {dict.connections.connection}
                    </Label>
                    <Controller
                      name={`stages.${index}.connection`}
                      control={control}
                      render={({ field: connectionField }) => (
                        <ReactSelect
                          {...connectionField}
                          className='react-select-container'
                          classNamePrefix='react-select'
                          isDisabled={readOnly}
                          options={connections.map((connection) => ({
                            value: connection.id,
                            label: connection.name,
                          }))}
                          value={
                            connections
                              .map((c) => ({
                                value: c.id,
                                label: c.name,
                              }))
                              .find(
                                (option) =>
                                  option.value === connectionField.value
                              ) || null
                          }
                          onChange={(option) => {
                            connectionField.onChange(
                              option ? (option as Option).value : ''
                            );
                            // Reset paths when selecting a new connection
                            setValue(
                              `stages.${index}.connection_write_path`,
                              '/'
                            );
                            setValue(
                              `stages.${index}.connection_read_path`,
                              '/'
                            );
                          }}
                        />
                      )}
                    />
                    {selectedConnection && (
                      <Button
                        href={`${workspaceUrl}/connections/${selectedConnection}`}
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
                        href={`${workspaceUrl}/connections/create`}
                        target='_blank'
                        variant='gray'
                        className='w-full'
                        size={'sm'}
                      >
                        {
                          dict.consoleNavigation.staticSearchItems
                            .createConnection
                        }
                      </Button>
                    )}
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`connection_write_path-${index}`}>
                      {dict.workflow.pipeline.connectionWritePath}
                    </Label>
                    <Input
                      id={`connection_write_path-${index}`}
                      placeholder={
                        dict.workflow.pipeline.connectionWritePathDescription
                      }
                      {...register(`stages.${index}.connection_write_path`)}
                      readOnly={readOnly || !selectedConnection}
                    />
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`connection_read_path-${index}`}>
                      {dict.workflow.pipeline.connectionReadPath}
                    </Label>
                    <Input
                      id={`connection_read_path-${index}`}
                      placeholder={
                        dict.workflow.pipeline.connectionReadPathDescription
                      }
                      {...register(`stages.${index}.connection_read_path`)}
                      readOnly={readOnly || !selectedConnection}
                    />
                  </div>
                </>
              )}

              {stageType === 'repository' && (
                <>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`repository-select-${index}`}>
                      {dict.repository.repository}
                    </Label>
                    <Controller
                      name={`stages.${index}.repository`}
                      control={control}
                      render={({ field: repositoryField }) => (
                        <ReactSelect
                          {...repositoryField}
                          className='react-select-container'
                          classNamePrefix='react-select'
                          isDisabled={readOnly}
                          options={repositories.map((repository) => ({
                            value: repository.slug,
                            label: repository.name,
                          }))}
                          value={
                            repositories
                              .map((r) => ({
                                value: r.slug,
                                label: r.name,
                              }))
                              .find(
                                (option) =>
                                  option.value === repositoryField.value
                              ) || null
                          }
                          onChange={(option) => {
                            repositoryField.onChange(
                              option ? (option as Option).value : ''
                            );
                            const defaultBranch = repositories.find(
                              (r) => r.slug === option?.value
                            )?.default_branch;
                            setValue(
                              `stages.${index}.branch`,
                              defaultBranch ?? ''
                            );
                          }}
                        />
                      )}
                    />
                    {selectedRepository && (
                      <Button
                        href={`${workspaceUrl}/repositories/${selectedRepository}`}
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
                        href={`${workspaceUrl}/repositories/create`}
                        target='_blank'
                        variant='gray'
                        className='w-full'
                        size={'sm'}
                      >
                        {
                          dict.consoleNavigation.staticSearchItems
                            .createRepository
                        }
                      </Button>
                    )}
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`branch-${index}`}>
                      {dict.repository.branches.branch}
                    </Label>
                    <Input
                      id={`branch-${index}`}
                      {...register(`stages.${index}.branch`)}
                      readOnly={readOnly || !selectedRepository}
                    />
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`path-${index}`}>
                      {dict.repository.objects.path}
                    </Label>
                    <Input
                      id={`path-${index}`}
                      {...register(`stages.${index}.path`)}
                      readOnly={readOnly || !selectedRepository}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <Button
          type='button'
          onClick={addStage}
          className='w-full'
          variant={'secondary'}
        >
          {dict.workflow.pipeline.addStage}
        </Button>
      )}

      {!readOnly && !hideSaveButton && (
        <Button type='submit' className='w-full' size={'lg'} variant={'accent'}>
          {dict.workflow.pipeline.savePipelineStages}
        </Button>
      )}
    </form>
  );
}
