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
import { usePopup } from '@/context/PopupContext';

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
  const { irminAlert } = usePopup();

  const {
    handleSubmit,
    control,
    formState: { errors: _errors, isSubmitting },
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
      if (!data.name.trim()) {
        irminAlert('error', dict.wizard.pleaseEnterWorkflowName);
        return;
      }

      if (!data.repository_branch.trim()) {
        irminAlert('error', dict.wizard.pleaseSelectRepositoryBranch);
        return;
      }

      if (!data.export_from_repository_paths.length) {
        irminAlert('error', dict.wizard.pleaseSelectRepositoryPaths);
        return;
      }

      if (!data.export_to_connection_path.trim()) {
        irminAlert('error', dict.wizard.pleaseSelectConnectionPath);
        return;
      }

      updateWizardData({
        workflowData: {
          ...wizardData.workflowData,
          ...data,
        },
      });

      goNext();
    },
    [wizardData.workflowData, updateWizardData, goNext, irminAlert, dict]
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
            rules={{ required: true }}
            render={({ field }) => (
              <Input
                {...field}
                id='name'
                placeholder={dict.wizard.workflowNamePlaceholder}
              />
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
                rows={3}
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
                rows={4}
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
            rules={{ required: true }}
            render={({ field }) => (
              <Input
                {...field}
                id='repository_branch'
                placeholder={dict.wizard.repositoryBranchPlaceholder}
              />
            )}
          />
        </div>

        {/* Export From Repository Paths */}
        <div className='flex flex-col gap-2'>
          <Label className='text-sm font-medium'>
            {dict.wizard.exportFromRepositoryPaths} *
          </Label>
          <Controller
            name='export_from_repository_paths'
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
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
                  />
                )}
              />
            )}
          />
        </div>

        {/* Export To Connection Path */}
        <div className='flex flex-col gap-2'>
          <Label className='text-sm font-medium'>
            {dict.wizard.exportToConnectionPath} *
          </Label>
          <Controller
            name='export_to_connection_path'
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <ConnectionPathSelector
                connectionId={wizardData.connection?.id ?? ''}
                defaultPath={field.value}
                operationMethod={'push'}
                onPathChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Sync Mode Configuration */}
        <div className='space-y-4'>
          <h4 className='font-medium'>{dict.workflow.syncMode}</h4>
          <div
            className={`
              rounded-md border border-blue-200 bg-blue-50 p-4
              dark:border-blue-800 dark:bg-blue-950
            `}
          >
            <p
              className={`
                text-sm text-blue-800
                dark:text-blue-200
              `}
            >
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
        <div className='rounded-md border border-foreground/20 px-2 py-4'>
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
