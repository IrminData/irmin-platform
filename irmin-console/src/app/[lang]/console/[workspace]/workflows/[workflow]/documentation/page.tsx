'use client';

import { useMemo } from 'react';

import { notFound } from 'next/navigation';

import WorkflowDocumentationSection from '@/components/workflow/WorkflowDocumentationSection';

import { useWorkspace } from '@/context/workspace';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow documentation
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function WorkflowDocumentationPage({
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
    [allWorkflows, workflowSlug]
  );
  if (!workflow) notFound();

  return <WorkflowDocumentationSection workflow={workflow} />;
}
