'use client';

import { useMemo } from 'react';

import { useWorkflow } from '@/context/WorkflowContext';

import { Repository } from '@/types/core/Repository';
import { PipelineStageInput } from '@/types/internal/WorkflowInput';

import PipelineStageEditor from './PipelineStageEditor';

/**
 * Workflow Pipeline section component
 */
const WorkflowPipelineSection = ({
  repositories,
}: {
  repositories: Repository[];
}) => {
  const { workflow } = useWorkflow();

  const stages: PipelineStageInput[] = useMemo(() => {
    if (workflow.type !== 'pipeline') return [];
    const stageInputs = workflow.workflowable.stages.map((stage) => {
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
    });
    return stageInputs.filter((stage) => stage !== undefined);
  }, [workflow.workflowable, workflow.type]);

  if (workflow.type !== 'pipeline') return <></>;

  return (
    <div
      className='bg-background relative container mx-auto my-8 max-w-4xl'
      id='workflow-pipeline-section'
    >
      <PipelineStageEditor
        initialStages={stages}
        repositories={repositories}
        readOnly={true}
        hideSaveButton={true}
        defaultCollapsed={true}
      />
    </div>
  );
};

export default WorkflowPipelineSection;
