'use client';

import { useCallback } from 'react';

import { Controller, useForm, useWatch } from 'react-hook-form';

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
import { Textarea } from '@/components/ui/textarea';
import MultiplePathsSelector from '@/components/workflow/MultiplePathsSelector';
import WorkflowScheduleForm from '@/components/workflow/WorkflowScheduleForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { SyncMode } from '@/types/core/Workflow';

import type { DataImportWizardData } from '../types';

/**
 * Step 3: Configure Import Settings
 *
 * Users configure the import workflow settings including paths
 */
export default function ConfigureImportStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
}: {
  wizardData: DataImportWizardData;
  updateWizardData: (updates: Partial<DataImportWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: wizardData.workflowData.name,
      description: wizardData.workflowData.description,
      documentation: wizardData.workflowData.documentation,
      import_from_connection_paths:
        wizardData.workflowData.import_from_connection_paths,
      repository_branch: wizardData.workflowData.repository_branch,
      import_to_repository_path:
        wizardData.workflowData.import_to_repository_path,
    },
  });

  const repositoryBranch = useWatch({
    control,
    name: 'repository_branch',
  });

  const handleSubmitForm = useCallback(
    async (data: {
      name: string;
      description: string;
      documentation: string;
      import_from_connection_paths: string[];
      repository_branch: string;
      import_to_repository_path: string;
    }) => {
      try {
        updateWizardData({
          workflowData: {
            ...wizardData.workflowData,
            name: data.name,
            description: data.description,
            documentation: data.documentation,
            import_from_connection_paths: data.import_from_connection_paths,
            repository_branch: data.repository_branch,
            import_to_repository_path: data.import_to_repository_path,
          },
        });
        goNext();
      } catch (error) {
        console.error(error);
        irminAlert('error', dict.wizard.failedToConfigureImport);
      }
    },
    [updateWizardData, wizardData.workflowData, goNext, irminAlert, dict]
  );

  return (
    <div className='flex w-full flex-col space-y-6 px-4 py-8'>
      <div className='flex flex-col gap-4'>
        <div>
          <h3 className='mb-2 text-lg font-semibold'>
            {dict.workflow.create.configureImport}
          </h3>
          <p className={`text-sm text-muted-foreground`}>
            {dict.wizard.configureImportDescription}
          </p>
        </div>
      </div>

      <div className='space-y-6'>
        {/* Workflow Basic Info */}
        <div className='space-y-4'>
          <h4 className='font-medium'>{dict.wizard.workflowInformation}</h4>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='import-workflow-name'>{dict.common.name}</Label>
            <Controller
              name='name'
              control={control}
              rules={{
                validate: (value) =>
                  value.trim().length > 0 ||
                  dict.wizard.pleaseEnterWorkflowName,
              }}
              render={({ field }) => (
                <>
                  <Input
                    {...field}
                    id='import-workflow-name'
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? 'import-workflow-name-error' : undefined
                    }
                  />
                  {errors.name && (
                    <p
                      id='import-workflow-name-error'
                      className='text-sm text-destructive'
                      role='alert'
                    >
                      {errors.name.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div className='flex flex-col gap-2'>
            <Label>
              {dict.common.description} ({dict.common.optional.toLowerCase()})
            </Label>
            <Controller
              name='description'
              control={control}
              render={({ field }) => (
                <>
                  <Textarea {...field} />
                  {errors.description && (
                    <p className='mt-1 text-xs text-destructive'>
                      {errors.description.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>
        </div>

        {/* Import Paths Configuration */}
        {wizardData.connection && (
          <Controller
            name='import_from_connection_paths'
            control={control}
            rules={{
              validate: (paths) =>
                paths.some((path) => path.trim().length > 0) ||
                dict.wizard.pleaseSpecifyImportPath,
            }}
            render={({ field }) => (
              <div
                role='group'
                aria-label={dict.workflow.importSourceConnectionPath}
                aria-describedby={
                  errors.import_from_connection_paths
                    ? 'import-source-paths-error'
                    : undefined
                }
              >
                <MultiplePathsSelector
                  label={dict.workflow.importSourceConnectionPath}
                  paths={field.value}
                  onPathsChange={(paths) => {
                    field.onChange(paths);
                    updateWizardData({
                      workflowData: {
                        ...wizardData.workflowData,
                        import_from_connection_paths: paths,
                      },
                    });
                  }}
                  renderPathSelector={(path, onPathChange) => (
                    <ConnectionPathSelector
                      connectionId={wizardData.connection!.id}
                      defaultPath={path}
                      operationMethod={'pull'}
                      onPathChange={onPathChange}
                      ariaInvalid={Boolean(errors.import_from_connection_paths)}
                      ariaDescribedBy={
                        errors.import_from_connection_paths
                          ? 'import-source-paths-error'
                          : undefined
                      }
                    />
                  )}
                />
                {errors.import_from_connection_paths && (
                  <p
                    id='import-source-paths-error'
                    className='text-sm text-destructive'
                    role='alert'
                  >
                    {errors.import_from_connection_paths.message}
                  </p>
                )}
              </div>
            )}
          />
        )}

        {/* Repository Configuration */}
        <div className='space-y-4'>
          <h4 className='font-medium'>{dict.wizard.repositorySettings}</h4>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='import-repository-branch'>
              {dict.wizard.repositoryBranch}
            </Label>
            <Controller
              name='repository_branch'
              control={control}
              rules={{
                validate: (value) =>
                  value.trim().length > 0 ||
                  dict.wizard.pleaseSelectRepositoryBranch,
              }}
              render={({ field }) => (
                <>
                  <Input
                    {...field}
                    id='import-repository-branch'
                    aria-invalid={Boolean(errors.repository_branch)}
                    aria-describedby={
                      errors.repository_branch
                        ? 'import-repository-branch-error'
                        : undefined
                    }
                  />
                  {errors.repository_branch && (
                    <p
                      id='import-repository-branch-error'
                      className='text-sm text-destructive'
                      role='alert'
                    >
                      {errors.repository_branch.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          {wizardData.repository && (
            <div className='flex flex-col gap-2'>
              <Label htmlFor='import-destination-path'>
                {dict.workflow.importDestinationPath}
              </Label>
              <Controller
                name='import_to_repository_path'
                control={control}
                rules={{
                  validate: (value) =>
                    value.trim().length > 0 ||
                    dict.wizard.pleaseSelectRepositoryDestinationPath,
                }}
                render={({ field }) => (
                  <>
                    <RepositoryPathSelector
                      repositorySlug={wizardData.repository?.slug ?? ''}
                      repositoryRef={
                        repositoryBranch ||
                        wizardData.workflowData.repository_branch
                      }
                      defaultPath={field.value}
                      onPathChange={field.onChange}
                      defaultExpanded={true}
                      inputId='import-destination-path'
                      ariaInvalid={Boolean(errors.import_to_repository_path)}
                      ariaDescribedBy={
                        errors.import_to_repository_path
                          ? 'import-destination-path-error'
                          : undefined
                      }
                    />
                    {errors.import_to_repository_path && (
                      <p
                        id='import-destination-path-error'
                        className='text-sm text-destructive'
                        role='alert'
                      >
                        {errors.import_to_repository_path.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>
          )}
        </div>

        {/* Sync Mode Configuration */}
        <div className='space-y-4'>
          <h4 className='font-medium'>{dict.workflow.syncMode}</h4>
          <div
            className={`
              rounded-[2px] border border-chart-2/30 bg-chart-2/10 p-4
            `}
          >
            <p className={`text-sm text-foreground`}>
              {dict.workflow.syncModeImportExplanation}
            </p>
          </div>
          <div className='flex flex-col gap-2'>
            <Label>{dict.workflow.syncMode}</Label>
            <Select
              value={wizardData.workflowData.sync_mode ?? 'auto'}
              onValueChange={(value) => {
                updateWizardData({
                  workflowData: {
                    ...wizardData.workflowData,
                    sync_mode: value as SyncMode,
                  },
                });
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='auto'>
                  {dict.workflow.syncModeAuto}
                </SelectItem>
                <SelectItem value='full'>
                  {dict.workflow.syncModeFull}
                </SelectItem>
                <SelectItem value='patch'>
                  {dict.workflow.syncModePatch}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              {dict.workflow.syncModeDescription}
            </p>
          </div>
        </div>

        {/* Schedule Configuration */}
        <div className='rounded-[2px] border border-border px-2 py-4'>
          <WorkflowScheduleForm
            initialData={wizardData.workflowData.schedule}
            disableSaveButton={true}
            updateSchedule={async (newSchedule) => {
              updateWizardData({
                workflowData: {
                  ...wizardData.workflowData,
                  schedule: newSchedule,
                },
              });
            }}
          />
        </div>

        <div className={`flex gap-3 border-t pt-4`}>
          <Button
            type='button'
            variant='secondary'
            onClick={goBack}
            className='flex-1'
            size='lg'
          >
            {dict.common.back}
          </Button>
          <Button
            type='button'
            className='flex-1'
            size='lg'
            variant='accent'
            onClick={handleSubmit(handleSubmitForm)}
            loading={isSubmitting}
          >
            {dict.common.continue}
          </Button>
        </div>
      </div>
    </div>
  );
}
