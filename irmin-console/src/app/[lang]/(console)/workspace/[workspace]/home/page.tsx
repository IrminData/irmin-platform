import { notFound } from 'next/navigation';

import { getWorkspace } from '@/lib/actions/workspaces';
import { getToken } from '@/lib/getToken';

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
  const token = await getToken();
  const [workspace] = await Promise.all([
    getWorkspace({ workspaceSlug: currentWorkspace, token }),
  ]);
  if (!workspace.data) return notFound();
  return <WorkspaceHomeSection workspace={workspace.data} />;
}
