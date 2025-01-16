import { getQueries } from '@/lib/actions/query';
import { getToken } from '@/lib/getToken';

import QueriesSection from '@/components/query/QueriesSection';

/**
 * Queries page in the workspace
 *
 * @remarks
 *
 * Used to view, create, save, and run queries on data in the workspace
 */
export default async function QueriesPage() {
  const token = await getToken();
  const queries = await getQueries(token);
  return <QueriesSection initialQueries={queries.data ?? []} />;
}
