import { notFound } from 'next/navigation';

import { getDict } from '@/lib/actions/dict';
import { getWorkspace } from '@/lib/actions/workspaces';
import { getToken } from '@/lib/getToken';

import RepositorySettingsSection from '@/components/repository/RepositorySettingsSection';

import { RepositoryRouteParams } from '../layout';

/**
 * Page for the Repository settings
 */
export default async function RepositorySettingsPage(props: {
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

  return (
    <RepositorySettingsSection dict={dict} currentWorkspace={workspace.data} />
  );
}
