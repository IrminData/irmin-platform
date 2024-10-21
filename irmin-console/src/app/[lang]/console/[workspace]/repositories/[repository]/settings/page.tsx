import { getDict } from '@/lib/actions/dict';
import { getWorkspace } from '@/lib/actions/workspaces';

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
  const [workspace, { dict }] = await Promise.all([
    getWorkspace(currentWorkspace),
    getDict(),
  ]);
  return <RepositorySettingsSection dict={dict} currentWorkspace={workspace} />;
}
