import { notFound } from 'next/navigation';

import { getDict } from '@/lib/actions/dict';
import { getWorkspace } from '@/lib/actions/workspaces';
import { getToken } from '@/lib/getToken';

import WorkspaceHomeSection from '@/components/workspace/WorkspaceHomeSection';

import { WorkspaceLayoutParams } from './layout';

/**
 * Workspace index page
 */
export default async function WorkspaceIndexPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;

  const currentWorkspace = params.workspace;
  const token = await getToken();
  const [workspace, { dict }] = await Promise.all([
    getWorkspace({ workspaceSlug: currentWorkspace, token }),
    getDict(),
  ]);
  if (!workspace.data) return notFound();
  return <WorkspaceHomeSection dict={dict} workspace={workspace.data} />;
}
