import { getDict } from '@/lib/actions/dict';
import { getWorkflows } from '@/lib/actions/workflows';
import { getWorkspace } from '@/lib/actions/workspaces';

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

  const [workspace, workflows, { dict }] = await Promise.all([
    getWorkspace(currentWorkspace),
    getWorkflows(),
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
