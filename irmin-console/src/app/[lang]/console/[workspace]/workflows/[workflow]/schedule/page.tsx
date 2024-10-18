'use client';

import { use, useMemo } from 'react';

import { notFound } from 'next/navigation';

import WorkflowScheduleSection from '@/components/workflow/WorkflowScheduleSection';

import { useWorkspace } from '@/context/workspace';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow schedule settings
 */
export default function WorkflowSchedulePage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = use(props.params);
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
