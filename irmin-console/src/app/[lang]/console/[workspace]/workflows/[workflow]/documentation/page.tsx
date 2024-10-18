'use client';

import { use, useMemo } from 'react';

import { notFound } from 'next/navigation';

import WorkflowDocumentationSection from '@/components/workflow/WorkflowDocumentationSection';

import { useWorkspace } from '@/context/workspace';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow documentation
 */
export default function WorkflowDocumentationPage(props: {
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

  return <WorkflowDocumentationSection workflow={workflow} />;
}
