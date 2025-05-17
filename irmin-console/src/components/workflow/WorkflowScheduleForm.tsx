'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ReactSelect from 'react-select';

import { Button } from '@/components/ui/button';
import CronGenerator from '@/components/ui/CronGenerator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RRuleGenerator from '@/components/ui/RRuleGenerator';

import { useLocale } from '@/context/LocaleContext';

import deepEqual from '@/utils/deepEqual';

import { Repository } from '@/types/core/Repository';
import {
  RepositoryEvent,
  RepositoryTrigger,
  ScheduleTrigger,
  TimeTrigger,
  WorkflowRunEvent,
  WorkflowRunTrigger,
  WorkflowSchedule,
} from '@/types/core/Schedule';
import { Workflow } from '@/types/core/Workflow';

interface FormTrigger {
  id: string;
  type: 'time' | 'repository-event' | 'workflow-run-event';
  timeFormat?: 'rrule' | 'cron';
  rrule?: string;
  cron?: string;
  event?: RepositoryEvent | WorkflowRunEvent;
  repository?: string;
  ref?: string;
  workflow?: string;
}

/**
 * Form to configure a workflow schedule using react-hook-form
 *
 * @param props - Component properties
 * @param props.initialData - Initial schedule data
 * @param props.workflows - List of workflows
 * @param props.repositories - List of repositories
 * @param props.updateSchedule - Callback to call in order to update the schedule
 * @param props.disableSaveButton - Disable the save button and auto-update schedule on change
 * @param props.hideTitle - Hide the title of the form
 */
function WorkflowScheduleForm({
  initialData,
  workflows,
  repositories,
  updateSchedule,
  disableSaveButton,
  hideTitle = false,
}: {
  initialData?: WorkflowSchedule;
  workflows: Workflow[];
  repositories: Repository[];
  updateSchedule: (schedule: WorkflowSchedule) => Promise<void>;
  disableSaveButton?: boolean;
  hideTitle?: boolean;
}) {
  const { dict } = useLocale();

  // Form state
  const [triggers, setTriggers] = useState<FormTrigger[]>(() => {
    if (!initialData?.triggers) return [];

    return initialData.triggers.map((trigger: ScheduleTrigger, index) => {
      const baseTrigger = {
        id: `${Date.now()}-${index}`,
        type: trigger.type,
      };

      switch (trigger.type) {
        case 'time': {
          const timeTrigger = trigger as TimeTrigger;
          return {
            ...baseTrigger,
            timeFormat: timeTrigger.cron ? 'cron' : 'rrule',
            cron: timeTrigger.cron,
            rrule: timeTrigger.rrule,
          } as FormTrigger;
        }
        case 'repository-event': {
          const repoTrigger = trigger as RepositoryTrigger;
          return {
            ...baseTrigger,
            event: repoTrigger.event,
            repository: repoTrigger.repository,
            ref: repoTrigger.ref,
          } as FormTrigger;
        }
        case 'workflow-run-event': {
          const workflowTrigger = trigger as WorkflowRunTrigger;
          return {
            ...baseTrigger,
            event: workflowTrigger.event,
            workflow: workflowTrigger.workflow,
          } as FormTrigger;
        }
        default:
          throw new Error(`Unknown trigger type`);
      }
    });
  });
  const [maxRetries, setMaxRetries] = useState(initialData?.max_retries ?? 3);
  const [maxRuntime, setMaxRuntime] = useState(initialData?.max_runtime ?? 15);
  const [minInterval, setMinInterval] = useState(
    initialData?.min_interval ?? 120
  );
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

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

  // Transform form data to a WorkflowSchedule object
  const formDataAsSchedule: WorkflowSchedule = useMemo(
    () => ({
      max_retries: maxRetries,
      max_runtime: maxRuntime,
      min_interval: minInterval,
      triggers: triggers.map((trigger) => {
        const { type } = trigger;
        if (type === 'time') {
          if (trigger.timeFormat === 'cron') {
            return { type, cron: trigger.cron! } as TimeTrigger;
          } else {
            return { type, rrule: trigger.rrule! } as TimeTrigger;
          }
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
      }),
    }),
    [triggers, maxRetries, maxRuntime, minInterval]
  );

  // Handle schedule update logic
  const handleUpdateSchedule = useCallback(
    async (formdata: WorkflowSchedule) => {
      try {
        setIsUpdatingSchedule(true);
        await updateSchedule(formdata);
      } catch (error) {
        console.error(error);
      } finally {
        setIsUpdatingSchedule(false);
      }
    },
    [updateSchedule]
  );

  // Handle form submission
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleUpdateSchedule(formDataAsSchedule);
    },
    [handleUpdateSchedule, formDataAsSchedule]
  );

  // Ref to store the previous sent schedule data
  const previousScheduleRef = useRef(formDataAsSchedule);

  // Call handleUpdateSchedule whenever form data changes if save button is disabled
  useEffect(() => {
    if (disableSaveButton) {
      if (!deepEqual(previousScheduleRef.current, formDataAsSchedule)) {
        handleUpdateSchedule(formDataAsSchedule);
        previousScheduleRef.current = formDataAsSchedule;
      }
    }
  }, [disableSaveButton, formDataAsSchedule, handleUpdateSchedule]);

  // Add a new trigger
  const addTrigger = useCallback(() => {
    setTriggers((prev) => [
      ...prev,
      { id: `${Date.now()}`, type: 'time', timeFormat: 'cron', cron: '' },
    ]);
  }, []);

  // Remove a trigger
  const removeTrigger = useCallback((index: number) => {
    setTriggers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update trigger type and reset fields accordingly
  const updateTriggerType = useCallback(
    (index: number, newType: FormTrigger['type']) => {
      setTriggers((prev) => {
        const newTriggers = [...prev];
        const updatedTrigger: FormTrigger = {
          id: newTriggers[index].id,
          type: newType,
        };
        if (newType === 'time') {
          updatedTrigger.timeFormat = 'cron';
          updatedTrigger.rrule = '';
          updatedTrigger.cron = '';
        } else if (newType === 'repository-event') {
          updatedTrigger.event = RepositoryEvent.PostCommit;
          updatedTrigger.repository = '';
          updatedTrigger.ref = '';
        } else if (newType === 'workflow-run-event') {
          updatedTrigger.event = WorkflowRunEvent.PostWorkflowRun;
          updatedTrigger.workflow = '';
        }
        newTriggers[index] = updatedTrigger;
        return newTriggers;
      });
    },
    []
  );

  // Update trigger field
  const updateTriggerField = useCallback(
    <K extends keyof FormTrigger>(
      index: number,
      field: K,
      value: FormTrigger[K]
    ) => {
      setTriggers((prev) => {
        const newTriggers = [...prev];
        newTriggers[index] = { ...newTriggers[index], [field]: value };
        return newTriggers;
      });
    },
    []
  );

  return (
    <form
      onSubmit={onSubmit}
      className='flex flex-col space-y-4'
      id='workflow-schedule-form'
    >
      {!hideTitle && (
        <h3 className='pl-1 text-lg'>
          {dict.workflow.schedule.workflowSchedule}
        </h3>
      )}

      {/* Max Retries Input */}
      <div className='flex flex-col space-y-2'>
        <Label htmlFor='max-retries'>{dict.workflow.schedule.maxRetries}</Label>
        <Input
          id='max-retries'
          type='number'
          value={maxRetries}
          onChange={(e) => setMaxRetries(Number(e.target.value))}
          disabled={isUpdatingSchedule}
        />
      </div>

      {/* Max Runtime Input */}
      <div className='flex flex-col space-y-2'>
        <Label htmlFor='max-runtime'>{dict.workflow.schedule.maxRuntime}</Label>
        <Input
          id='max-runtime'
          type='number'
          value={maxRuntime}
          onChange={(e) => setMaxRuntime(Number(e.target.value))}
          disabled={isUpdatingSchedule}
        />
      </div>

      {/* Min Interval Input */}
      <div className='flex flex-col space-y-2'>
        <Label htmlFor='min-interval'>
          {dict.workflow.schedule.minInterval}
        </Label>
        <Input
          id='min-interval'
          type='number'
          value={minInterval}
          onChange={(e) => setMinInterval(Number(e.target.value))}
          disabled={isUpdatingSchedule}
        />
      </div>

      {/* Triggers Array */}
      {triggers.map((trigger, index) => (
        <div
          key={trigger.id}
          className='border-foreground/10 flex flex-col border-t py-4'
        >
          <div className='mb-4 flex items-center justify-between'>
            <h4 className='text-md pl-1 font-semibold'>
              {dict.workflow.schedule.trigger} {index + 1}
            </h4>
            <Button
              variant='destructive'
              size='sm'
              disabled={isUpdatingSchedule}
              onClick={() => removeTrigger(index)}
            >
              {dict.common.remove}
            </Button>
          </div>

          <div className='space-y-4'>
            {/* Trigger Type Select */}
            <div className='flex flex-col space-y-2'>
              <Label>{dict.workflow.schedule.triggerType}</Label>
              <ReactSelect
                value={triggerTypeOptions.find(
                  (option) => option.value === trigger.type
                )}
                onChange={(selectedOption) => {
                  const newType = selectedOption?.value as FormTrigger['type'];
                  updateTriggerType(index, newType);
                }}
                options={triggerTypeOptions}
                className='react-select-container'
                classNamePrefix='react-select'
                isDisabled={isUpdatingSchedule}
              />
            </div>

            {/* Conditional Fields Based on Trigger Type */}
            {trigger.type === 'time' && (
              <div className='space-y-4'>
                <div className='flex flex-col space-y-2'>
                  <Label>{dict.workflow.schedule.timeFormat}</Label>
                  <ReactSelect
                    value={{
                      value: trigger.timeFormat || 'cron',
                      label:
                        trigger.timeFormat === 'cron'
                          ? 'Cron Expression'
                          : 'Recurrence Rule (RRule)',
                    }}
                    onChange={(selectedOption) => {
                      updateTriggerField(
                        index,
                        'timeFormat',
                        selectedOption?.value
                      );
                    }}
                    options={[
                      { value: 'cron', label: 'Cron Expression' },
                      { value: 'rrule', label: 'Recurrence Rule (RRule)' },
                    ]}
                    className='react-select-container'
                    classNamePrefix='react-select'
                    isDisabled={isUpdatingSchedule}
                  />
                </div>

                {trigger.timeFormat === 'cron' ? (
                  <div className='flex flex-col space-y-2'>
                    <Label>{dict.workflow.schedule.cronExpression}</Label>
                    <CronGenerator
                      expression={trigger.cron}
                      onSave={(cron: string) => {
                        updateTriggerField(index, 'cron', cron);
                      }}
                      isDisabled={isUpdatingSchedule}
                    />
                  </div>
                ) : (
                  <div className='flex flex-col space-y-2'>
                    <Label>{dict.workflow.schedule.recurrenceRule}</Label>
                    <RRuleGenerator
                      isDisabled={isUpdatingSchedule}
                      rule={trigger.rrule}
                      onGenerate={(rrule: string) => {
                        updateTriggerField(index, 'rrule', rrule);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {trigger.type === 'repository-event' && (
              <>
                <div className='flex flex-col space-y-2'>
                  <Label>{dict.workflow.schedule.repositoryEventTrigger}</Label>
                  <ReactSelect
                    isDisabled={isUpdatingSchedule}
                    value={{ value: trigger.event, label: trigger.event }}
                    onChange={(selectedOption) => {
                      updateTriggerField(index, 'event', selectedOption?.value);
                    }}
                    options={Object.values(RepositoryEvent).map((event) => ({
                      value: event,
                      label: event,
                    }))}
                    className='react-select-container'
                    classNamePrefix='react-select'
                  />
                </div>

                <div className='flex flex-col space-y-2'>
                  <Label htmlFor={`triggers.${index}.repository`}>
                    {dict.repository.repository}
                  </Label>
                  <ReactSelect
                    id={`triggers.${index}.repository`}
                    isDisabled={isUpdatingSchedule}
                    value={{
                      value: trigger.repository,
                      label:
                        repositories.find(
                          (repo) => trigger.repository === repo.slug
                        )?.name ?? trigger.repository,
                    }}
                    onChange={(selectedOption) => {
                      updateTriggerField(
                        index,
                        'repository',
                        selectedOption?.value
                      );
                      const repo = repositories.find(
                        (repo) => selectedOption?.value === repo.slug
                      );
                      if (repo) {
                        updateTriggerField(index, 'ref', repo.default_branch);
                      }
                    }}
                    options={repositories.map((repo) => ({
                      value: repo.slug,
                      label: repo.name,
                    }))}
                    className='react-select-container'
                    classNamePrefix='react-select'
                  />
                </div>

                <div className='flex flex-col space-y-2'>
                  <Label htmlFor={`triggers.${index}.ref`}>
                    {dict.repository.branches.branch}
                  </Label>
                  <Input
                    id={`triggers.${index}.ref`}
                    value={trigger.ref}
                    onChange={(e) =>
                      updateTriggerField(index, 'ref', e.target.value)
                    }
                    disabled={isUpdatingSchedule}
                  />
                </div>
              </>
            )}

            {trigger.type === 'workflow-run-event' && (
              <>
                <div className='flex flex-col space-y-2'>
                  <Label>
                    {dict.workflow.schedule.workflowRunEventTrigger}
                  </Label>
                  <ReactSelect
                    isDisabled={isUpdatingSchedule}
                    value={{ value: trigger.event, label: trigger.event }}
                    onChange={(selectedOption) => {
                      updateTriggerField(index, 'event', selectedOption?.value);
                    }}
                    options={Object.values(WorkflowRunEvent).map((event) => ({
                      value: event,
                      label: event,
                    }))}
                    className='react-select-container'
                    classNamePrefix='react-select'
                  />
                </div>

                <div className='flex flex-col space-y-2'>
                  <Label htmlFor={`triggers.${index}.workflow`}>
                    {dict.workflow.workflow}
                  </Label>
                  <ReactSelect
                    id={`triggers.${index}.workflow`}
                    isDisabled={isUpdatingSchedule}
                    value={{
                      value: trigger.workflow,
                      label: (() => {
                        const workflow = workflows.find(
                          (w) => trigger.workflow === w.id
                        );
                        return `${workflow?.name} (${workflow?.type})`;
                      })(),
                    }}
                    onChange={(selectedOption) => {
                      updateTriggerField(
                        index,
                        'workflow',
                        selectedOption?.value
                      );
                    }}
                    options={workflows.map((workflow) => ({
                      value: workflow.id,
                      label: `${workflow.name} (${workflow.type})`,
                    }))}
                    className='react-select-container'
                    classNamePrefix='react-select'
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      <div className='flex flex-wrap gap-2'>
        {/* Add Trigger Button */}
        <Button
          onClick={addTrigger}
          variant={'secondary'}
          className='w-full'
          size='sm'
          disabled={isUpdatingSchedule}
        >
          {dict.workflow.schedule.addTrigger}
        </Button>

        {/* Submit Button */}
        {!disableSaveButton && (
          <Button
            type='submit'
            className='w-full'
            variant={'default'}
            size={'default'}
            loading={isUpdatingSchedule}
          >
            {dict.workflow.schedule.saveSchedule}
          </Button>
        )}
      </div>
    </form>
  );
}

export default memo(WorkflowScheduleForm);
