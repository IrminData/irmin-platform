'use client';

import { useMemo } from 'react';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useWorkflow } from '@/hooks/useWorkflow';

import { PipelineStageInput } from '@/types/internal/WorkflowInput';

import PipelineStageEditor from './PipelineStageEditor';

/**
 * Workflow Pipeline section component
 */
const WorkflowPipelineSection = ({ workflowID }: { workflowID: string }) => {
  const { workflowQuery } = useWorkflow(workflowID);

  const stages: PipelineStageInput[] = useMemo(() => {
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
          } as PipelineStageInput;
        }
        if (stage.type === 'connection') {
          return {
            type: stage.type,
            description: stage.description || '',
            write: stage.write || false,
            read: stage.read || false,
            connection: stage.connection_id || '',
            connection_read_path: stage.connection_read_path || '',
            connection_write_path: stage.connection_write_path || '',
          } as PipelineStageInput;
        }
        if (stage.type === 'repository') {
          return {
            type: stage.type,
            description: stage.description || '',
            write: stage.write || false,
            read: stage.read || false,
            repository: stage.repository || '',
            branch: stage.branch || '',
            path: stage.path || '',
          } as PipelineStageInput;
        }
      }
    );
    return stageInputs.filter((stage) => stage !== undefined);
  }, [workflowQuery.data?.data?.workflowable, workflowQuery.data?.data?.type]);

  if (workflowQuery.isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  if (workflowQuery.isError) {
    return <div>Error: {workflowQuery.error.message}</div>;
  }

  if (!workflowQuery.data?.data) {
    return <div>No data</div>;
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
