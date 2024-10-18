'use client';

import { use, useMemo } from 'react';

import { notFound } from 'next/navigation';

import WorkflowSection from '@/components/workflow/WorkflowSection';

import { useWorkspace } from '@/context/workspace';

import { SingleWorkflowLayoutParams } from './layout';

/**
 * Single workflow page
 */
export default function WorkflowPage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = use(props.params);
  const workflowId = params.workflow;

  const {
    workflows: { allWorkflows },
  } = useWorkspace();

  const workflow = useMemo(
    () => allWorkflows.find((item) => item.id === workflowId),
    [allWorkflows, workflowId]
  );
  if (!workflow) notFound();

  return <WorkflowSection workflow={workflow} />;
}
