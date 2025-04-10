import { getWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ConnectionSection from '@/components/connection/ConnectionSection';

import { SingleConnectionLayoutParams } from './layout';

/**
 * Page for the Connection overview
 */
export default async function ConnectionOverviewPage(props: {
  params: Promise<SingleConnectionLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;
  const token = await getToken();
  const workflows = await getWorkflows({ workspace: currentWorkspace, token }); // TODO: We need to fetch workflows specific to this connection
  return <ConnectionSection workflows={workflows.data ?? []} />;
}
