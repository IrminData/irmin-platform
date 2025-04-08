import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import DocumentationSchemaSection from '@/components/documentation/DocumentationSchemaSection';

import { WorkspaceLayoutParams } from '../../layout';

/**
 * Page to show the schema documentation for the workspace
 */
export default async function DocumentationSchemaPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const token = await getToken();
  const [connections, workflows, repositories] = await Promise.all([
    getConnections({ workspace: currentWorkspace, token }),
    getWorkflows({ workspace: currentWorkspace, token }),
    getRepositories({ workspace: currentWorkspace, token }),
  ]);

  return (
    <DocumentationSchemaSection
      connections={connections.data ?? []}
      workflows={workflows.data ?? []}
      repositories={repositories.data ?? []}
    />
  );
}
