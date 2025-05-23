import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import WorkflowPipelineSection from '@/components/workflow/WorkflowPipelineSection';

import { SingleWorkflowLayoutParams } from '../layout';

/**
 * Single workflow pipeline page
 */
export default async function WorkflowPipelinePage(props: {
  params: Promise<SingleWorkflowLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const repositories = await getRepositories({
    workspace: params.workspace,
    token,
  });
  return (
    <WorkflowPipelineSection
      workflowID={params.workflow}
      repositories={repositories.data ?? []}
    />
  );
}
