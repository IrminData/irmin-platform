'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import ReactSelect from 'react-select';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RRuleGenerator from '@/components/ui/RRuleGenerator';

import { useLocale } from '@/context/LocaleContext';

import deepEqual from '@/utils/deepEqual';

import { Repository } from '@/types/core/Repository';
import { Workflow } from '@/types/core/Workflow';
import {
  RepositoryEvent,
  RepositoryTrigger,
  TimeTrigger,
  WorkflowRunEvent,
  WorkflowRunTrigger,
  WorkflowSchedule,
} from '@/types/core/WorkflowSchedule';

interface FormTrigger {
  id: string;
  type: 'time' | 'repository-event' | 'workflow-run-event';
  rrule?: string;
  event?: RepositoryEvent | WorkflowRunEvent;
  repository?: string;
  ref?: string;
  workflow?: string;
}

interface WorkflowScheduleFormData {
  triggers: FormTrigger[];
  max_retries?: number;
  max_runtime?: number;
  min_interval?: number;
}

/**
 * Form to configure a workflow schedule using react-hook-form
 *
 * @param props - Component properties
 * @param props.workflows - List of workflows to select from
 * @param props.repositories - List of repositories to select from
 * @param props.initialData - Initial schedule data
 * @param props.updateSchedule - Callback to call in order to update the schedule
 * @param props.disableSaveButton - Disable the save button and auto-update schedule on change
 */
export default function WorkflowScheduleForm({
  workflows,
  repositories,
  initialData,
  updateSchedule,
  disableSaveButton,
}: {
  workflows: Workflow[];
  repositories: Repository[];
  initialData?: WorkflowSchedule;
  updateSchedule: (schedule: WorkflowSchedule) => void;
  disableSaveButton?: boolean;
}) {
  const { dict } = useLocale();

  // Initialize react-hook-form
  const { register, handleSubmit, control, watch, setValue } =
    useForm<WorkflowScheduleFormData>({
      defaultValues: {
        triggers: initialData ? initialData.triggers : [],
        max_retries: initialData ? initialData.max_retries : 3,
        max_runtime: initialData ? initialData.max_runtime : 15,
        min_interval: initialData ? initialData.min_interval : 120,
      },
    });

  // Manage the triggers array using useFieldArray
  const {
    fields: triggerFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'triggers',
  });

  // Trigger type options for the Select component
  const triggerTypeOptions = useMemo(
    () => [
      { value: 'time', label: dict.workflow.schedule.timeTrigger },
      {
        value: 'repository-event',
        label: dict.workflow.schedule.repositoryEventTrigger,
      },
      {
        value: 'workflow-run-event',
        label: dict.workflow.schedule.workflowRunEventTrigger,
      },
    ],
    [dict.workflow.schedule]
  );

  // Watch form data for changes
  const formData = useWatch({ control });

  // Transform form data to a WorkflowSchedule object
  const formDataAsSchedule: WorkflowSchedule = useMemo(
    () => ({
      max_retries: formData.max_retries,
      max_runtime: formData.max_runtime,
      min_interval: formData.min_interval,
      triggers:
        formData.triggers?.map((trigger) => {
          const { type } = trigger;
          if (type === 'time') {
            return { type, rrule: trigger.rrule! } as TimeTrigger;
          } else if (type === 'repository-event') {
            return {
              type,
              event: trigger.event as RepositoryEvent,
              repository: trigger.repository,
              ref: trigger.ref,
            } as RepositoryTrigger;
          } else if (type === 'workflow-run-event') {
            return {
              type,
              event: trigger.event as WorkflowRunEvent,
              workflow: trigger.workflow,
            } as WorkflowRunTrigger;
          } else {
            throw new Error(`Unknown trigger type: ${type}`);
          }
        }) ?? [],
    }),
    [formData]
  );

  // Handle form submission
  const onSubmit = useCallback(() => {
    updateSchedule(formDataAsSchedule);
  }, [updateSchedule, formDataAsSchedule]);

  // Ref to store the previous sent schedule data
  const previousScheduleRef = useRef(formDataAsSchedule);

  // Call updateSchedule whenever form data changes if save button is disabled
  useEffect(() => {
    if (disableSaveButton) {
      if (!deepEqual(previousScheduleRef.current, formDataAsSchedule)) {
        updateSchedule(formDataAsSchedule);
        previousScheduleRef.current = formDataAsSchedule;
      }
    }
  }, [disableSaveButton, formDataAsSchedule, updateSchedule]);

  // Add a new trigger
  const addTrigger = useCallback(() => {
    append({ id: `${Date.now()}`, type: 'time' });
  }, [append]);

  // Update trigger type and reset fields accordingly
  const updateTriggerType = useCallback(
    (index: number, newType: FormTrigger['type']) => {
      const updatedTrigger: FormTrigger = {
        id: triggerFields[index].id,
        type: newType,
      };
      if (newType === 'time') {
        updatedTrigger.rrule = '';
      } else if (newType === 'repository-event') {
        updatedTrigger.event = RepositoryEvent.PostCommit;
        updatedTrigger.repository = '';
        updatedTrigger.ref = '';
      } else if (newType === 'workflow-run-event') {
        updatedTrigger.event = WorkflowRunEvent.PostWorkflowRun;
        updatedTrigger.workflow = '';
      }
      setValue(`triggers.${index}`, updatedTrigger);
    },
    [setValue, triggerFields]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <h3 className='pl-1 text-lg'>
        {dict.workflow.schedule.workflowSchedule}
      </h3>

      {/* Max Retries Input */}
      <div className='space-y-2'>
        <Label htmlFor='max-retries'>{dict.workflow.schedule.maxRetries}</Label>
        <Input
          id='max-retries'
          type='number'
          {...register('max_retries', { valueAsNumber: true })}
        />
      </div>

      {/* Max Runtime Input */}
      <div className='space-y-2'>
        <Label htmlFor='max-runtime'>{dict.workflow.schedule.maxRuntime}</Label>
        <Input
          id='max-runtime'
          type='number'
          {...register('max_runtime', { valueAsNumber: true })}
        />
      </div>

      {/* Min Interval Input */}
      <div className='space-y-2'>
        <Label htmlFor='min-interval'>
          {dict.workflow.schedule.minInterval}
        </Label>
        <Input
          id='min-interval'
          type='number'
          {...register('min_interval', { valueAsNumber: true })}
        />
      </div>

      {/* Triggers Array */}
      {triggerFields.map((triggerField, index) => {
        // Watch the current trigger to handle dynamic fields
        const trigger = watch(`triggers.${index}`);

        return (
          <div
            key={triggerField.id}
            className='flex flex-col border-t border-foreground/10 py-4'
          >
            <div className='mb-4 flex items-center justify-between'>
              <h4 className='text-md pl-1 font-semibold'>
                {dict.workflow.schedule.trigger} {index + 1}
              </h4>
              <Button
                variant='destructive'
                size='sm'
                onClick={() => remove(index)}
              >
                {dict.misc.remove}
              </Button>
            </div>

            <div className='space-y-4'>
              {/* Trigger Type Select */}
              <div className='space-y-2'>
                <Label>{dict.workflow.schedule.triggerType}</Label>
                <Controller
                  control={control}
                  name={`triggers.${index}.type`}
                  render={({ field }) => (
                    <ReactSelect
                      value={triggerTypeOptions.find(
                        (option) => option.value === field.value
                      )}
                      onChange={(selectedOption) => {
                        const newType =
                          selectedOption?.value as FormTrigger['type'];
                        updateTriggerType(index, newType);
                      }}
                      options={triggerTypeOptions}
                      className='react-select-container'
                      classNamePrefix='react-select'
                    />
                  )}
                />
              </div>

              {/* Conditional Fields Based on Trigger Type */}
              {trigger.type === 'time' && (
                <div className='space-y-2'>
                  <Label>{dict.workflow.schedule.recurrenceRule}</Label>
                  <Controller
                    control={control}
                    name={`triggers.${index}.rrule`}
                    render={({ field }) => (
                      <RRuleGenerator
                        rule={field.value}
                        onGenerate={(rrule: string) => {
                          field.onChange(rrule);
                        }}
                      />
                    )}
                  />
                </div>
              )}

              {trigger.type === 'repository-event' && (
                <>
                  <div className='space-y-2'>
                    <Label>
                      {dict.workflow.schedule.repositoryEventTrigger}
                    </Label>
                    <Controller
                      control={control}
                      name={`triggers.${index}.event`}
                      render={({ field }) => (
                        <ReactSelect
                          value={{
                            value: field.value,
                            label: field.value,
                          }}
                          onChange={(selectedOption) => {
                            field.onChange(
                              selectedOption?.value as RepositoryEvent
                            );
                          }}
                          options={Object.values(RepositoryEvent).map(
                            (event) => ({ value: event, label: event })
                          )}
                          className='react-select-container'
                          classNamePrefix='react-select'
                        />
                      )}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor={`triggers.${index}.repository`}>
                      {dict.repository.repository}
                    </Label>
                    <Controller
                      control={control}
                      name={`triggers.${index}.repository`}
                      render={({ field }) => (
                        <ReactSelect
                          id={`triggers.${index}.repository`}
                          defaultValue={{
                            value: field.value,
                            label:
                              repositories.find(
                                (repo) => field.value === repo.slug
                              )?.name ?? field.value,
                          }}
                          onChange={(selectedOption) => {
                            field.onChange(selectedOption?.value);
                            const repo = repositories.find(
                              (repo) => selectedOption?.value === repo.slug
                            );
                            if (repo) {
                              setValue(
                                `triggers.${index}.ref`,
                                repo.default_branch
                              );
                            }
                          }}
                          options={repositories.map((repo) => ({
                            value: repo.slug,
                            label: repo.name,
                          }))}
                          className='react-select-container'
                          classNamePrefix='react-select'
                        />
                      )}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor={`triggers.${index}.ref`}>
                      {dict.repository.branches.branch}
                    </Label>
                    <Input
                      id={`triggers.${index}.ref`}
                      {...register(`triggers.${index}.ref`)}
                    />
                  </div>
                </>
              )}

              {trigger.type === 'workflow-run-event' && (
                <>
                  <div className='space-y-2'>
                    <Label>
                      {dict.workflow.schedule.workflowRunEventTrigger}
                    </Label>
                    <Controller
                      control={control}
                      name={`triggers.${index}.event`}
                      render={({ field }) => (
                        <ReactSelect
                          value={{
                            value: field.value,
                            label: field.value,
                          }}
                          onChange={(selectedOption) => {
                            field.onChange(
                              selectedOption?.value as WorkflowRunEvent
                            );
                          }}
                          options={Object.values(WorkflowRunEvent).map(
                            (event) => ({ value: event, label: event })
                          )}
                          className='react-select-container'
                          classNamePrefix='react-select'
                        />
                      )}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor={`triggers.${index}.workflow`}>
                      {dict.workflow.workflow}
                    </Label>
                    <Controller
                      control={control}
                      name={`triggers.${index}.workflow`}
                      render={({ field }) => (
                        <ReactSelect
                          id={`triggers.${index}.workflow`}
                          defaultValue={{
                            value: field.value,
                            label: (() => {
                              const workflow = workflows.find(
                                (workflow) => field.value === workflow.id
                              );
                              return `${workflow?.name} (${workflow?.workflowable_type})`;
                            })(),
                          }}
                          onChange={(selectedOption) => {
                            field.onChange(selectedOption?.value);
                          }}
                          options={workflows.map((workflow) => ({
                            value: workflow.id,
                            label: `${workflow.name} (${workflow.workflowable_type})`,
                          }))}
                          className='react-select-container'
                          classNamePrefix='react-select'
                        />
                      )}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}

      <div className='flex flex-wrap gap-2'>
        {/* Add Trigger Button */}
        <Button
          onClick={addTrigger}
          variant={'secondary'}
          className='w-full'
          size='sm'
        >
          {dict.workflow.schedule.addTrigger}
        </Button>

        {/* Submit Button */}
        {!disableSaveButton && (
          <Button type='submit' className='w-full' variant={'gray'} size={'sm'}>
            {dict.workflow.schedule.saveSchedule}
          </Button>
        )}
      </div>
    </form>
  );
}
