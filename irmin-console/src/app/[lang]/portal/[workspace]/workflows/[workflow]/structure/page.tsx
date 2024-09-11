'use client';

import { useMemo } from 'react';

import WorkflowStructureSection from '@/components/workflow/WorkflowStructureSection';

import { useWorkspace } from '@/context/workspace';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow structure
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function WorkflowStructurePage({
  params,
}: {
  params: SingleWorkflowLayoutParams;
}) {
  const workflowSlug = params.workflow;

  const {
    workflows: { allWorkflows },
  } = useWorkspace();
  const workflow = useMemo(
    () => allWorkflows.find((item) => item.slug === workflowSlug),
    [workflowSlug, allWorkflows]
  );
  if (!workflow) return <></>;

  return <WorkflowStructureSection workflow={workflow} />;
}
