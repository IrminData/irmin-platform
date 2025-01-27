'use client';

import { useWorkflow } from '@/context/WorkflowContext';

import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';

import PipelineStageEditor from './PipelineStageEditor';

/**
 * Workflow Pipeline section component
 */
const WorkflowPipelineSection = ({
  repositories,
  connections,
}: {
  repositories: Repository[];
  connections: Connection[];
}) => {
  const { workflow } = useWorkflow();

  if (workflow.type !== 'pipeline') return <></>;

  return (
    <div
      className='bg-background relative container mx-auto my-8 max-w-4xl'
      id='workflow-pipeline-section'
    >
      <PipelineStageEditor
        initialStages={workflow.workflowable.stages.map((stage) => ({
          type: stage.type,
          description: stage.description,
          write: stage.write,
          read: stage.read,
          executable: stage.type === 'action' ? stage.executable : undefined,
          connection:
            stage.type === 'connection' ? stage.connection.id : undefined,
          connection_write_path:
            stage.type === 'connection'
              ? stage.connection_write_path
              : undefined,
          connection_read_path:
            stage.type === 'connection'
              ? stage.connection_read_path
              : undefined,
          repository:
            stage.type === 'repository' ? stage.repository.slug : undefined,
          branch: stage.type === 'repository' ? stage.branch : undefined,
          path: stage.type === 'repository' ? stage.path : undefined,
        }))}
        repositories={repositories}
        connections={connections}
        readOnly={true}
        hideSaveButton={true}
      />
    </div>
  );
};

export default WorkflowPipelineSection;
