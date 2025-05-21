import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflows } from '@/lib/actions/workflows';
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
  const [workflows, repositories] = await Promise.all([
    getWorkflows({ workspace: currentWorkspace, token }),
    getRepositories({ workspace: currentWorkspace, token }),
  ]);

  return (
    <DocumentationSection
      workflows={workflows.data ?? []}
      repositories={repositories.data ?? []}
    />
  );
}
