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
      repository_branch: string;
      import_to_repository_path: string;
    }) => {
      try {
        // Validate that we have import paths
        if (wizardData.workflowData.import_from_connection_paths.length === 0) {
          irminAlert('error', dict.wizard.pleaseSpecifyImportPath);
          return;
        }

        updateWizardData({
          workflowData: {
            ...wizardData.workflowData,
            name: data.name,
            description: data.description,
            documentation: data.documentation,
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
          <p
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.wizard.configureImportDescription}
          </p>
        </div>
      </div>

      <div className='space-y-6'>
        {/* Workflow Basic Info */}
        <div className='space-y-4'>
          <h4 className='font-medium'>{dict.wizard.workflowInformation}</h4>

          <div className='flex flex-col gap-2'>
            <Label>{dict.common.name}</Label>
            <Controller
              name='name'
              control={control}
              rules={{ required: dict.common.fieldRequired }}
              render={({ field }) => (
                <>
                  <Input {...field} />
                  {errors.name && (
                    <p className='mt-1 text-xs text-red-600'>
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
                  <Textarea {...field} rows={3} />
                  {errors.description && (
                    <p className='mt-1 text-xs text-red-600'>
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
          <MultiplePathsSelector
            label={dict.workflow.importSourceConnectionPath}
            paths={wizardData.workflowData.import_from_connection_paths}
            onPathsChange={(paths) =>
              updateWizardData({
                workflowData: {
                  ...wizardData.workflowData,
                  import_from_connection_paths: paths,
                },
              })
            }
            renderPathSelector={(path, onPathChange) => (
              <ConnectionPathSelector
                connectionId={wizardData.connection!.id}
                defaultPath={path}
                operationMethod={'pull'}
                onPathChange={onPathChange}
              />
            )}
          />
        )}

        {/* Repository Configuration */}
        <div className='space-y-4'>
          <h4 className='font-medium'>{dict.wizard.repositorySettings}</h4>

          <div className='flex flex-col gap-2'>
            <Label>{dict.wizard.repositoryBranch}</Label>
            <Controller
              name='repository_branch'
              control={control}
              rules={{ required: dict.common.fieldRequired }}
              render={({ field }) => (
                <>
                  <Input {...field} />
                  {errors.repository_branch && (
                    <p className='mt-1 text-xs text-red-600'>
                      {errors.repository_branch.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          {wizardData.repository && (
            <div className='flex flex-col gap-2'>
              <Label>{dict.workflow.importDestinationPath}</Label>
              <Controller
                name='import_to_repository_path'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <RepositoryPathSelector
                    repositorySlug={wizardData.repository?.slug ?? ''}
                    repositoryRef={
                      repositoryBranch ||
                      wizardData.workflowData.repository_branch
                    }
                    defaultPath={field.value}
                    onPathChange={field.onChange}
                    defaultExpanded={true}
                  />
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

        <div
          className={`
            flex gap-3 border-t pt-4
            dark:border-gray-800
          `}
        >
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
            variant='default'
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
