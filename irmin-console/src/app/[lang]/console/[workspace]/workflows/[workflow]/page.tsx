'use client';

import { useMemo } from 'react';

import { notFound } from 'next/navigation';

import WorkflowSection from '@/components/workflow/WorkflowSection';

import { useWorkspace } from '@/context/workspace';

import { SingleWorkflowLayoutParams } from './layout';

/**
 * Single workflow page
 *
 * @param props0 - The page properties
 * @param props0.params - The page parameters from Next JS router
 */
export default function WorkflowPage({
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

  return <WorkflowSection workflow={workflow} />;
}
