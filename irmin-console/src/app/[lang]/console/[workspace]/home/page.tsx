import { getDict } from '@/lib/actions/dict';
import { getWorkspace } from '@/lib/actions/workspaces';

import WorkspaceHomeSection from '@/components/workspace/WorkspaceHomeSection';

import { WorkspaceLayoutParams } from '../layout';

/**
 * Workspace home page
 */
export default async function WorkspaceHomePage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;

  const currentWorkspace = params.workspace;
  const [workspace, { dict }] = await Promise.all([
    getWorkspace(currentWorkspace),
    getDict(),
  ]);
  return <WorkspaceHomeSection dict={dict} workspace={workspace} />;
}
