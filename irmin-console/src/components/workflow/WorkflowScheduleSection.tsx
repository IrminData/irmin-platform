'use client';

import { useCallback } from 'react';

import { FaPause, FaPlay } from 'react-icons/fa6';

import Button from '@/components/ui/button';
import ContentWrapper from '@/components/ui/ContentWrapper';
import WorkflowScheduleForm from '@/components/workflow/WorkflowScheduleForm';

import { useLocale } from '@/context/LocaleContext';
import { useWorkflow } from '@/context/WorkflowContext';

import { Repository } from '@/types/core/Repository';
import { WorkflowSchedule } from '@/types/core/Schedule';
import { Workflow } from '@/types/core/Workflow';

/**
 * Workflow Schedule section component
 *
 * Handles workflow schedule viewing and updates.
 */
const WorkflowScheduleSection = ({
  workflows,
  repositories,
}: {
  workflows: Workflow[];
  repositories: Repository[];
}) => {
  const { dict } = useLocale();
  const { workflow, updateWorkflowSchedule, resumeWorkflow, pauseWorkflow } =
    useWorkflow();

  const handleUpdateWorkflowSchedule = useCallback(
    async (schedule: WorkflowSchedule) => {
      await updateWorkflowSchedule(schedule);
    },
    [updateWorkflowSchedule]
  );

  const handlePauseOrResume = useCallback(async () => {
    if (workflow.status === 'paused') {
      await resumeWorkflow();
    } else {
      await pauseWorkflow();
    }
  }, [workflow, pauseWorkflow, resumeWorkflow]);

  return (
    <ContentWrapper>
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
        workflows={workflows}
        repositories={repositories}
      />
    </ContentWrapper>
  );
};

export default WorkflowScheduleSection;
