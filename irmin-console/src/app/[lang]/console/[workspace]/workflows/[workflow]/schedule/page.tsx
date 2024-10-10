'use client';

import { useMemo } from 'react';

import { notFound } from 'next/navigation';

import WorkflowScheduleSection from '@/components/workflow/WorkflowScheduleSection';

import { useWorkspace } from '@/context/workspace';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow schedule settings
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function WorkflowSchedulePage({
  params,
}: {
  params: SingleWorkflowLayoutParams;
}) {
  const workflowId = params.workflow;
  if (isInvalidRouteProp(workflowId)) notFound();

  const {
    workflows: { allWorkflows },
  } = useWorkspace();

  const workflow = useMemo(
    () => allWorkflows.find((item) => item.id === workflowId),
    [allWorkflows, workflowId]
  );

  if (!workflow) notFound();

  return <WorkflowScheduleSection workflow={workflow} />;
}
