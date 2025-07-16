import WorkflowPoliciesSection from '@/components/workflow/WorkflowPoliciesSection';

import type { SingleWorkflowLayoutParams } from '../../layout';

/**
 * Page for the Workflow run policies
 */
export default async function WorkflowRunPoliciesPage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return (
    <WorkflowPoliciesSection
      workflowID={params.workflow}
      type={'workflow_run'}
    />
  );
}
