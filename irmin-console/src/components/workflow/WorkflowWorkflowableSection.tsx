'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflow } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import type {
  Action,
  Export,
  Import,
  Pipeline,
  Workflowable,
} from '@/types/core/Workflow';
import type { WorkflowRequest } from '@/types/internal/WorkflowInput';

import ActionWorkflow from './Workflowable/ActionWorkflow';
import ExportWorkflow from './Workflowable/ExportWorkflow';
import ImportWorkflow from './Workflowable/ImportWorkflow';
import PipelineWorkflow from './Workflowable/PipelineWorkflow';

type WorkflowableUpdater =
  | WorkflowRequest
  | ((_prevState: WorkflowRequest) => WorkflowRequest);

/**
 * Workflow Pipeline section component
 */
const WorkflowWorkflowableSection = ({
  workflowID,
}: {
  workflowID: string;
}) => {
  const { dict } = useLocale();
  const { workflowQuery, updateWorkflowableMutation } = useWorkflow(workflowID);
  const { isResourceAllowed } = useResourceAllowed();

  // Local state to track workflowable changes
  const [currentWorkflowable, setCurrentWorkflowable] =
    useState<Workflowable | null>(null);
  // Track whether user has made manual changes
  const [hasManualChanges, setHasManualChanges] = useState(false);

  const workflow = workflowQuery.data?.data;

  // Reset manual changes flag when workflow ID changes
  useEffect(() => {
    return () => {
      // Cleanup on unmount or workflow change
      setHasManualChanges(false);
      setCurrentWorkflowable(null);
    };
  }, [workflowID]);

  // Derive active workflowable: use edited version if exists, otherwise use server data
  const activeWorkflowable = useMemo(() => {
    if (hasManualChanges && currentWorkflowable) {
      return currentWorkflowable;
    }
    return workflow?.workflowable ?? null;
  }, [hasManualChanges, currentWorkflowable, workflow?.workflowable]);

  // Create a wrapper function to handle workflowable updates
  const handleWorkflowableUpdate = useCallback(
    (updater: WorkflowableUpdater) => {
      // Mark that user has made manual changes
      setHasManualChanges(true);

      if (typeof updater === 'function') {
        setCurrentWorkflowable((prev) => {
          if (!prev || !workflow) return prev;
          // Create a mock WorkflowRequest with all required properties
          const mockWorkflowData: WorkflowRequest = {
            type: workflow.type,
            name: workflow.name,
            description: workflow.description,
            documentation: workflow.documentation,
            workflowable: prev,
            schedule: workflow.schedule,
            tags: workflow.tags?.map((tag) => tag.id),
          };
          const updated = updater(mockWorkflowData);
          // Allow falsy values if explicitly set, but fall back to prev if undefined
          return updated.workflowable !== undefined
            ? (updated.workflowable ?? null)
            : prev;
        });
      } else {
        // Direct value update - extract workflowable from WorkflowRequest
        // Allow falsy values if workflowable property exists in the updater
        if ('workflowable' in updater) {
          setCurrentWorkflowable(updater.workflowable ?? null);
        }
      }
    },
    [workflow]
  );

  const handleSave = useCallback(() => {
    // Save uses currentWorkflowable since it's only available when user made changes
    if (currentWorkflowable && hasManualChanges) {
      updateWorkflowableMutation.mutate(currentWorkflowable, {
        onSuccess: () => {
          // Reset manual changes flag after successful save
          setHasManualChanges(false);
        },
      });
    }
  }, [currentWorkflowable, hasManualChanges, updateWorkflowableMutation]);

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

  if (!workflow?.workflowable || !activeWorkflowable) {
    return <></>;
  }

  const canUpdate = isResourceAllowed('workflow', 'update', workflowID);

  // Create a mock workflow data structure for components that need the full workflow
  const mockWorkflowData: WorkflowRequest = {
    ...workflow,
    workflowable: activeWorkflowable,
    tags: workflow.tags?.map((tag) => tag.id),
  };

  return (
    <div
      className={`
        relative container mx-auto my-8 flex w-full max-w-4xl flex-col
        bg-background px-4 pb-6
      `}
      id='workflow-workflowable-section'
    >
      <div className='flex flex-col gap-4 py-4'>
        {activeWorkflowable.type === 'action' && (
          <ActionWorkflow
            workflowable={activeWorkflowable as Action}
            setWorkflowData={handleWorkflowableUpdate}
          />
        )}
        {activeWorkflowable.type === 'import' && (
          <ImportWorkflow
            workflowable={activeWorkflowable as Import}
            setWorkflowData={handleWorkflowableUpdate}
          />
        )}
        {activeWorkflowable.type === 'export' && (
          <ExportWorkflow
            workflowable={activeWorkflowable as Export}
            setWorkflowData={handleWorkflowableUpdate}
          />
        )}
        {activeWorkflowable.type === 'pipeline' && (
          <PipelineWorkflow
            workflowable={activeWorkflowable as Pipeline}
            workflowData={mockWorkflowData}
            setWorkflowData={handleWorkflowableUpdate}
          />
        )}
      </div>
      {canUpdate && (
        <div
          className={`
            mt-auto border-t pt-4
            dark:border-gray-800
          `}
        >
          <Button
            className='mb-6 inline-block w-full'
            variant='gradient'
            size={'lg'}
            onClick={handleSave}
            loading={updateWorkflowableMutation.isPending}
            disabled={updateWorkflowableMutation.isPending || !hasManualChanges}
          >
            {dict.common.save}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkflowWorkflowableSection;
