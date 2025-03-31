import { getStoredQueries } from '@/lib/actions/query';
import { getToken } from '@/lib/getToken';

import QueriesSection from '@/components/query/QueriesSection';

import { WorkspaceLayoutParams } from '../layout';

/**
 * Queries page in the workspace
 *
 * @remarks
 *
 * Used to view, create, save, and run queries on data in the workspace
 */
export default async function QueriesPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const queries = await getStoredQueries({
    workspace: params.workspace,
    token,
  });
  return <QueriesSection initialQueries={queries.data ?? []} />;
}
