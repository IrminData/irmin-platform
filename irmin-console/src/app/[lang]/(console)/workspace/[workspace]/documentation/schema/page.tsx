import { getRepositories } from '@/lib/actions/repositories';
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
  const repositories = await getRepositories({
    workspace: currentWorkspace,
    token,
  });

  return <DocumentationSchemaSection repositories={repositories.data ?? []} />;
}
