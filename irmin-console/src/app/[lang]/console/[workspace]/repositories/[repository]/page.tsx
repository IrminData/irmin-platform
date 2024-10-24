import { getDict } from '@/lib/actions/dict';
import { getWorkflows } from '@/lib/actions/workflows';
import { getWorkspace } from '@/lib/actions/workspaces';
import { getToken } from '@/lib/getToken';

import RepositorySection from '@/components/repository/RepositorySection';

import { QueryProvider } from '@/context/QueryContext';

import { RepositoryRouteParams } from './layout';

/**
 * Page for the Repository viewer
 *
 * Uses {@link RepositorySection} to display the Repository viewer
 */
export default async function RepositoryPage(props: {
  params: Promise<RepositoryRouteParams>;
}) {
  const params = await props.params;

  const currentWorkspace = params.workspace;

  const token = await getToken();
  const [workspace, workflows, { dict }] = await Promise.all([
    getWorkspace(currentWorkspace, token),
    getWorkflows(token),
    getDict(),
  ]);

  return (
    <QueryProvider>
      <RepositorySection
        currentWorkspace={workspace}
        workflows={workflows}
        dict={dict}
      />
    </QueryProvider>
  );
}
