'use client';

import React, { useCallback, useRef } from 'react';

import { FaPause, FaPlay } from 'react-icons/fa6';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import deepEqual from '@/utils/deepEqual';

import { Workflow } from '@/types/core/Workflow';
import { WorkflowSchedule } from '@/types/core/WorkflowSchedule';

import WorkflowScheduleForm from './WorkflowScheduleForm';

/**
 * Workflow Schedule section component
 *
 * Handles workflow schedule viewing and updates.
 *
 * @param props - The props
 * @param props.workflow - The workflow to view and edit settings for
 */
const WorkflowScheduleSection = ({ workflow }: { workflow: Workflow }) => {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const {
    workflows: { updateWorkflow, resumeWorkflow, pauseWorkflow },
  } = useWorkspace();

  const previousScheduleRef = useRef(workflow.schedule);
  const processing = useRef(false);

  /**
   * Updates the workflow schedule with the new details provided
   */
  const handleUpdateWorkflowSchedule = useCallback(
    async (schedule: WorkflowSchedule) => {
      if (processing.current) return;
      try {
        processing.current = true;
        if (!workflow) return;
        if (deepEqual(previousScheduleRef.current, schedule)) return;

        const res = await updateWorkflow(workflow.id, {
          ...workflow,
          schedule,
        });

        irminAlert(
          'success',
          res.message ?? 'Workflow schedule updated successfully'
        );
        previousScheduleRef.current = schedule;
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error updating the workflow schedule'
        );
      } finally {
        processing.current = false;
      }
    },
    [workflow, updateWorkflow, irminAlert]
  );

  /**
   * Pauses or resumes the workflow based on the current status
   */
  const handlePauseOrResume = useCallback(async () => {
    if (processing.current) return;
    try {
      processing.current = true;
      if (workflow.status === 'paused') {
        const res = await resumeWorkflow(workflow.id);
        irminAlert('success', res.message ?? 'Workflow resumed successfully');
      } else {
        const res = await pauseWorkflow(workflow.id);
        irminAlert('success', res.message ?? 'Workflow paused successfully');
      }
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          'Error pausing or resuming the workflow. Please try again.'
      );
    } finally {
      processing.current = false;
    }
  }, [workflow, pauseWorkflow, resumeWorkflow, irminAlert]);

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
