'use client';

import { useCallback } from 'react';

import PipelineStageEditor from '@/components/workflow/PipelineStageEditor';

import type { Pipeline, PipelineStage } from '@/types/core/Workflow';
import type { WorkflowRequest } from '@/types/internal/WorkflowInput';

interface PipelineWorkflowProps {
  workflowable: Pipeline;
  workflowData: WorkflowRequest;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowRequest>>;
}

export default function PipelineWorkflow({
  workflowable,
  workflowData,
  setWorkflowData,
}: PipelineWorkflowProps) {
  const handlePipelineStagesSubmit = useCallback(
    (stages: PipelineStage[]) => {
      setWorkflowData({
        ...workflowData,
        workflowable: {
          ...(workflowable as Pipeline),
          stages,
        },
      });
    },
    [setWorkflowData, workflowData, workflowable]
  );

  return (
    <PipelineStageEditor
      initialStages={workflowable.stages ?? []}
      onSubmit={handlePipelineStagesSubmit}
      readOnly={false}
      hideSaveButton={true}
      defaultCollapsed={false}
    />
  );
}
