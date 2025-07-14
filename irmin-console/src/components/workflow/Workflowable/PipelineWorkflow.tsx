'use client';

import { useCallback } from 'react';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import PipelineStageEditor from '@/components/workflow/PipelineStageEditor';

import { useLocale } from '@/context/LocaleContext';

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
  const { dict } = useLocale();

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
    <>
      <PipelineStageEditor
        initialStages={[]}
        onSubmit={handlePipelineStagesSubmit}
        readOnly={false}
        hideSaveButton={true}
        defaultCollapsed={false}
      />
      <div className='flex flex-col gap-2'>
        <Label>{dict.workflow.pipeline.livePipeline}</Label>
        <Switch
          checked={workflowable.live ?? false}
          onCheckedChange={(checked) =>
            setWorkflowData((prev) => ({
              ...prev,
              workflowable: {
                ...(prev.workflowable as Pipeline),
                live: checked,
              },
            }))
          }
        />
      </div>
    </>
  );
}
