import { notFound } from 'next/navigation';

import { getWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ConnectionSection from '@/components/connection/ConnectionSection';

import { WorkspaceLayoutParams } from '../../layout';

/**
 * Page for the Connection overview
 */
export default async function ConnectionOverviewPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const token = await getToken();
  const workflows = await getWorkflows({ workspace: currentWorkspace, token });
  if (!workflows.data) {
    return notFound();
  }
  return <ConnectionSection workflows={workflows.data} />;
}
