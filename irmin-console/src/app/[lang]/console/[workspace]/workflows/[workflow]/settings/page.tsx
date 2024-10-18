'use client';

import { use, useMemo } from 'react';

import { notFound } from 'next/navigation';

import WorkflowSettingsSection from '@/components/workflow/WorkflowSettingsSection';

import { useWorkspace } from '@/context/workspace';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow settings
 */
export default function WorkflowSettingsPage(props: {
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

  return <WorkflowSettingsSection workflow={workflow} />;
}
