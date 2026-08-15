'use client';

import { useCallback } from 'react';

import { Controller, useForm } from 'react-hook-form';

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

import type { SyncMode } from '@/types/core/Workflow';

import type { DataExportWizardData } from '../types';

/**
 * Step 3: Configure Export Settings
 *
 * Users configure the export workflow settings including paths
 */
export default function ConfigureExportStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
}: {
  wizardData: DataExportWizardData;
  updateWizardData: (updates: Partial<DataExportWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: wizardData.workflowData.name,
      description: wizardData.workflowData.description,
      documentation: wizardData.workflowData.documentation,
      repository_branch: wizardData.workflowData.repository_branch,
      export_from_repository_paths:
        wizardData.workflowData.export_from_repository_paths,
      export_to_connection_path:
        wizardData.workflowData.export_to_connection_path,
    },
  });

  const onSubmit = useCallback(
    (data: {
      name: string;
      description: string;
      documentation: string;
      repository_branch: string;
      export_from_repository_paths: string[];
      export_to_connection_path: string;
    }) => {
      updateWizardData({
        workflowData: {
          ...wizardData.workflowData,
          ...data,
        },
      });

      goNext();
    },
    [wizardData.workflowData, updateWizardData, goNext]
  );

  return (
    <div className='flex w-full flex-col space-y-6 px-4 py-8'>
      <div className='flex flex-col gap-4'>
        <div>
          <h3 className='mb-2 text-lg font-semibold'>
            {dict.wizard.configureExportSettings}
          </h3>
          <p className={`text-sm text-muted-foreground`}>
            {dict.wizard.configureExportSettingsDescription}
          </p>
        </div>
      </div>

      <div className='space-y-6'>
        {/* Workflow Name */}
        <div className='flex flex-col gap-2'>
          <Label htmlFor='name' className='text-sm font-medium'>
            {dict.wizard.workflowName} *
          </Label>
          <Controller
            name='name'
            control={control}
            rules={{
              validate: (value) =>
                value.trim().length > 0 || dict.wizard.pleaseEnterWorkflowName,
            }}
            render={({ field }) => (
              <>
                <Input
                  {...field}
                  id='name'
                  placeholder={dict.wizard.workflowNamePlaceholder}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={
                    errors.name ? 'export-workflow-name-error' : undefined
                  }
                />
                {errors.name && (
                  <p
                    id='export-workflow-name-error'
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

        {/* Workflow Description */}
        <div className='flex flex-col gap-2'>
          <Label htmlFor='description' className='text-sm font-medium'>
            {dict.wizard.workflowDescription} (
            {dict.common.optional.toLowerCase()})
          </Label>
          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id='description'
                placeholder={dict.wizard.workflowDescriptionPlaceholder}
              />
            )}
          />
        </div>

        {/* Workflow Documentation */}
        <div className='flex flex-col gap-2'>
          <Label htmlFor='documentation' className='text-sm font-medium'>
            {dict.wizard.workflowDocumentation}
          </Label>
          <Controller
            name='documentation'
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id='documentation'
                placeholder={dict.wizard.workflowDocumentationPlaceholder}
              />
            )}
          />
        </div>

        {/* Repository Branch */}
        <div className='flex flex-col gap-2'>
          <Label htmlFor='repository_branch' className='text-sm font-medium'>
            {dict.wizard.repositoryBranch} *
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
                  id='repository_branch'
                  placeholder={dict.wizard.repositoryBranchPlaceholder}
                  aria-invalid={Boolean(errors.repository_branch)}
                  aria-describedby={
                    errors.repository_branch
                      ? 'export-repository-branch-error'
                      : undefined
                  }
                />
                {errors.repository_branch && (
                  <p
                    id='export-repository-branch-error'
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

        {/* Export From Repository Paths */}
        <div className='flex flex-col gap-2'>
          <Label
            id='export-repository-paths-label'
            className='text-sm font-medium'
          >
            {dict.wizard.exportFromRepositoryPaths} *
          </Label>
          <Controller
            name='export_from_repository_paths'
            control={control}
            rules={{
              validate: (paths) =>
                paths.some((path) => path.trim().length > 0) ||
                dict.wizard.pleaseSelectRepositoryPaths,
            }}
            render={({ field }) => (
              <div
                role='group'
                aria-labelledby='export-repository-paths-label'
                aria-describedby={
                  errors.export_from_repository_paths
                    ? 'export-repository-paths-error'
                    : undefined
                }
              >
                <MultiplePathsSelector
                  label={dict.wizard.exportFromRepositoryPaths}
                  paths={field.value}
                  onPathsChange={field.onChange}
                  renderPathSelector={(path, onPathChange) => (
                    <RepositoryPathSelector
                      repositorySlug={wizardData.repository?.slug ?? ''}
                      repositoryRef={wizardData.workflowData.repository_branch}
                      defaultPath={path}
                      onPathChange={onPathChange}
                      ariaInvalid={Boolean(errors.export_from_repository_paths)}
                      ariaDescribedBy={
                        errors.export_from_repository_paths
                          ? 'export-repository-paths-error'
                          : undefined
                      }
                    />
                  )}
                />
                {errors.export_from_repository_paths && (
                  <p
                    id='export-repository-paths-error'
                    className='text-sm text-destructive'
                    role='alert'
                  >
                    {errors.export_from_repository_paths.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>

        {/* Export To Connection Path */}
        <div className='flex flex-col gap-2'>
          <Label
            htmlFor='export-connection-path'
            className='text-sm font-medium'
          >
            {dict.wizard.exportToConnectionPath} *
          </Label>
          <Controller
            name='export_to_connection_path'
            control={control}
            rules={{
              validate: (value) =>
                value.trim().length > 0 ||
                dict.wizard.pleaseSelectConnectionPath,
            }}
            render={({ field }) => (
              <>
                <ConnectionPathSelector
                  connectionId={wizardData.connection?.id ?? ''}
                  defaultPath={field.value}
                  operationMethod={'push'}
                  onPathChange={field.onChange}
                  inputId='export-connection-path'
                  ariaInvalid={Boolean(errors.export_to_connection_path)}
                  ariaDescribedBy={
                    errors.export_to_connection_path
                      ? 'export-connection-path-error'
                      : undefined
                  }
                />
                {errors.export_to_connection_path && (
                  <p
                    id='export-connection-path-error'
                    className='text-sm text-destructive'
                    role='alert'
                  >
                    {errors.export_to_connection_path.message}
                  </p>
                )}
              </>
            )}
          />
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
              {dict.workflow.syncModeExportExplanation}
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

        <div className={`border-t pt-4`}>
          <div className='flex gap-3'>
            <Button
              type='button'
              className='flex-1'
              size='lg'
              variant='secondary'
              onClick={goBack}
            >
              {dict.common.back}
            </Button>
            <Button
              type='button'
              className='flex-1'
              size='lg'
              variant='accent'
              onClick={handleSubmit(onSubmit)}
              loading={isSubmitting}
            >
              {dict.common.continue}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
