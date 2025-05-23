import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import DocumentationSection from '@/components/documentation/DocumentationSection';

import { WorkspaceLayoutParams } from '../layout';

/**
 * Page to show the full documentation for the workspace
 */
export default async function DocumentationPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const token = await getToken();
  const repositories = await getRepositories({
    workspace: currentWorkspace,
    token,
  });

  return <DocumentationSection repositories={repositories.data ?? []} />;
}
