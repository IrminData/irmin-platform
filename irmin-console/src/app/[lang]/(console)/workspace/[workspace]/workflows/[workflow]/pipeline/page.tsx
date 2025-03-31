import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import WorkflowPipelineSection from '@/components/workflow/WorkflowPipelineSection';

import { WorkspaceLayoutParams } from '../../../layout';

/**
 * Single workflow pipeline page
 */
export default async function WorkflowPipelinePage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const [repositories, connections] = await Promise.all([
    getRepositories({
      workspace: params.workspace,
      token,
    }),
    getConnections({
      workspace: params.workspace,
      token,
    }),
  ]);
  return (
    <WorkflowPipelineSection
      repositories={repositories.data ?? []}
      connections={connections.data ?? []}
    />
  );
}
