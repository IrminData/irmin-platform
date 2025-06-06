import WorkflowPoliciesSection from '@/components/workflow/WorkflowPoliciesSection';

import { PolicyResource } from '@/types/core/Policy';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Page for the Workflow policies
 */
export default async function WorkflowPoliciesPage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  return (
    <WorkflowPoliciesSection
      workflowID={params.workflow}
      type={PolicyResource.Workflow}
    />
  );
}
