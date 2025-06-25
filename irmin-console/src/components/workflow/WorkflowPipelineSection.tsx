'use client';

import { useMemo } from 'react';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflow } from '@/hooks/useWorkflow';

import { PipelineStage } from '@/types/core/Workflow';

import PipelineStageEditor from './PipelineStageEditor';

/**
 * Workflow Pipeline section component
 */
const WorkflowPipelineSection = ({ workflowID }: { workflowID: string }) => {
  const { dict } = useLocale();
  const { workflowQuery } = useWorkflow(workflowID);

  const stages: PipelineStage[] = useMemo(() => {
    if (workflowQuery.data?.data?.type !== 'pipeline') return [];
    const stageInputs = workflowQuery.data?.data.workflowable.stages.map(
      (stage) => {
        if (stage.type === 'action') {
          return {
            type: stage.type,
            description: stage.description || '',
            write: stage.write || false,
            read: stage.read || false,
            executable: stage.executable || '',
          } as PipelineStage;
        }
        if (stage.type === 'connection') {
          return {
            type: stage.type,
            description: stage.description || '',
            write: stage.write || false,
            read: stage.read || false,
            connection_id: stage.connection_id || '',
            connection_read_path: stage.connection_read_path || '',
            connection_write_path: stage.connection_write_path || '',
          } as PipelineStage;
        }
        if (stage.type === 'repository') {
          return {
            type: stage.type,
            description: stage.description || '',
            write: stage.write || false,
            read: stage.read || false,
            repository: stage.repository || '',
            repository_branch: stage.repository_branch || '',
            repository_path: stage.repository_path || '',
          } as PipelineStage;
        }
      }
    );
    return stageInputs.filter((stage) => stage !== undefined);
  }, [workflowQuery.data?.data?.workflowable, workflowQuery.data?.data?.type]);

  if (workflowQuery.isLoading) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  if (workflowQuery.isError) {
    return (
      <div>
        {dict.common.error}: {workflowQuery.error.message}
      </div>
    );
  }

  if (!workflowQuery.data?.data) {
    return <></>;
  }

  const workflow = workflowQuery.data.data;

  if (workflow.type !== 'pipeline') return <></>;

  return (
    <div
      className='bg-background relative container mx-auto my-8 max-w-4xl'
      id='workflow-pipeline-section'
    >
      <PipelineStageEditor
        initialStages={stages}
        readOnly={true}
        hideSaveButton={true}
        defaultCollapsed={true}
      />
    </div>
  );
};

export default WorkflowPipelineSection;
