'use client';

import { useCallback } from 'react';

import { FaPause, FaPlay } from 'react-icons/fa6';

import Button from '@/components/ui/button';
import WorkflowScheduleForm from '@/components/workflow/WorkflowScheduleForm';

import { useLocale } from '@/context/LocaleContext';
import { useWorkflow } from '@/context/WorkflowContext';

import { WorkflowSchedule } from '@/types/core/WorkflowSchedule';

/**
 * Workflow Schedule section component
 *
 * Handles workflow schedule viewing and updates.
 */
const WorkflowScheduleSection = () => {
  const { dict } = useLocale();
  const { workflow, updateWorkflow, resumeWorkflow, pauseWorkflow } =
    useWorkflow();

  const handleUpdateWorkflowSchedule = useCallback(
    async (schedule: WorkflowSchedule) => {
      await updateWorkflow({
        schedule,
      });
    },
    [updateWorkflow]
  );

  const handlePauseOrResume = useCallback(async () => {
    if (workflow.status === 'paused') {
      await resumeWorkflow();
    } else {
      await pauseWorkflow();
    }
  }, [workflow, pauseWorkflow, resumeWorkflow]);

  return (
    <div
      className='container relative mx-auto my-8 max-w-6xl'
      id='workflow-schedule-section'
    >
      <div className='container relative mx-auto my-8 max-w-6xl'>
        <div className='w-full max-w-3xl rounded-lg border-b border-t border-accent bg-background px-4 py-4 shadow-md md:mx-4'>
          <div className='my-8 px-4'>
            <div className='float-right mb-4'>
              {workflow.status === 'paused' ? (
                <Button
                  size='sm'
                  variant='secondary'
                  icon={<FaPlay size={14} />}
                  onClick={handlePauseOrResume}
                >
                  {dict.workflow.settings.resumeWorkflow}
                </Button>
              ) : (
                <Button
                  size='sm'
                  variant='secondary'
                  icon={<FaPause size={14} />}
                  onClick={handlePauseOrResume}
                >
                  {dict.workflow.settings.pauseWorkflow}
                </Button>
              )}
            </div>
            <WorkflowScheduleForm
              initialData={workflow.schedule}
              updateSchedule={handleUpdateWorkflowSchedule}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowScheduleSection;
