import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import DocumentationSection from '@/components/documentation/DocumentationSection';

/**
 * Page to show the full documentation for the workspace
 */
export default async function DocumentationPage() {
  const token = await getToken();
  const [connections, workflows, repositories] = await Promise.all([
    getConnections(token),
    getWorkflows(token),
    getRepositories(token),
  ]);

  if (!connections || !workflows || !repositories) {
    return notFound();
  }

  return (
    <DocumentationSection
      connections={connections}
      workflows={workflows}
      repositories={repositories}
    />
  );
}
