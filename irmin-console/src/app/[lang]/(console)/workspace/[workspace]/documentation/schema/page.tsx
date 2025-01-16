import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import DocumentationSchemaSection from '@/components/documentation/DocumentationSchemaSection';

/**
 * Page to show the schema documentation for the workspace
 */
export default async function DocumentationSchemaPage() {
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
    <DocumentationSchemaSection
      connections={connections}
      workflows={workflows}
      repositories={repositories}
    />
  );
}
