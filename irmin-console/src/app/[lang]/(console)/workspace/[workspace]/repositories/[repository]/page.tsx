import { notFound } from 'next/navigation';

import { getDict } from '@/lib/actions/dict';
import { getWorkspace } from '@/lib/actions/workspaces';
import { getToken } from '@/lib/getToken';

import RepositorySection from '@/components/repository/RepositorySection';

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
  const [workspace, { dict }] = await Promise.all([
    getWorkspace({ workspaceSlug: currentWorkspace, token }),
    getDict(),
  ]);

  if (!workspace.data) return notFound();

  return <RepositorySection currentWorkspace={workspace.data} dict={dict} />;
}
