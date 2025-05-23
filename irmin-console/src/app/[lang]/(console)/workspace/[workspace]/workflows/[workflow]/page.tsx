import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import WorkflowSection from '@/components/workflow/WorkflowSection';

import { SingleWorkflowLayoutParams } from './layout';

/**
 * Single workflow page
 */
export default async function WorkflowPage(
  props: Readonly<{
    children: React.ReactNode;
    params: Promise<SingleWorkflowLayoutParams>;
  }>
) {
  const params = await props.params;
  const { workflow, workspace } = params;

  const token = await getToken();
  const repositories = await getRepositories({
    workspace,
    token,
  });

  return (
    <WorkflowSection
      workflowID={workflow}
      repositories={repositories.data ?? []}
    />
  );
}
