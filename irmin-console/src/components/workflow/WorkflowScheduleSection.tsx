'use client';

import { useCallback } from 'react';

import { FaPause, FaPlay } from 'react-icons/fa6';

import { Button } from '@/components/ui/button';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import WorkflowScheduleForm from '@/components/workflow/WorkflowScheduleForm';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflow } from '@/hooks/useWorkflow';

import type { WorkflowSchedule } from '@/types/core/Schedule';

/**
 * Workflow Schedule section component
 *
 * Handles workflow schedule viewing and updates.
 */
const WorkflowScheduleSection = ({ workflowID }: { workflowID: string }) => {
  const { dict } = useLocale();
  const {
    workflowQuery,
    updateWorkflowScheduleMutation,
    resumeWorkflowMutation,
    pauseWorkflowMutation,
  } = useWorkflow(workflowID);

  const handleUpdateWorkflowSchedule = useCallback(
    async (schedule: WorkflowSchedule) => {
      await updateWorkflowScheduleMutation.mutateAsync(schedule);
    },
    [updateWorkflowScheduleMutation]
  );

  const handlePauseOrResume = useCallback(async () => {
    if (workflowQuery.data?.data?.status === 'paused') {
      await resumeWorkflowMutation.mutateAsync();
    } else {
      await pauseWorkflowMutation.mutateAsync();
    }
  }, [
    workflowQuery.data?.data?.status,
    resumeWorkflowMutation,
    pauseWorkflowMutation,
  ]);

  return (
    <ContentWrapper>
      <div className='flex justify-end'>
        {workflowQuery.data?.data?.status === 'paused' ? (
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
        initialData={workflowQuery.data?.data?.schedule}
        updateSchedule={handleUpdateWorkflowSchedule}
        hideTitle={true}
      />
    </ContentWrapper>
  );
};

export default WorkflowScheduleSection;
