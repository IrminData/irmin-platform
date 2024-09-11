'use client';

import { useMemo } from 'react';

import WorkflowRunsSection from '@/components/workflow/WorkflowRunsSection';

import { useWorkspace } from '@/context/workspace';

import { SingleWorkflowLayoutParams } from './layout';

/**
 * Page for the Workflow structure
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function WorkflowRunsPage({
  params,
}: {
  params: SingleWorkflowLayoutParams;
}) {
  const workflowId = parseInt(params.workflow, 10);

  const {
    workflows: { allWorkflows },
  } = useWorkspace();
  const workflow = useMemo(
    () => allWorkflows.find((item) => item.id === workflowId),
    [workflowId, allWorkflows]
  );
  if (!workflow) return <></>;

  return <WorkflowRunsSection workflow={workflow} />;
}
