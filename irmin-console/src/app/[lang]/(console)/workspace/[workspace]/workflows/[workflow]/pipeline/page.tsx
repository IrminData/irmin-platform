import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import WorkflowPipelineSection from '@/components/workflow/WorkflowPipelineSection';

/**
 * Single workflow pipeline page
 */
export default async function WorkflowPipelinePage() {
  const token = await getToken();
  const [repositories, connections] = await Promise.all([
    getRepositories(token),
    getConnections(token),
  ]);
  if (!repositories || !connections) {
    return notFound();
  }
  return (
    <WorkflowPipelineSection
      repositories={repositories}
      connections={connections}
    />
  );
}
