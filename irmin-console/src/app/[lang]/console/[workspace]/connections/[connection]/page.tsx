import { notFound } from 'next/navigation';

import { getWorkflows } from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ConnectionSection from '@/components/connection/ConnectionSection';

/**
 * Page for the Connection overview
 */
export default async function ConnectionOverviewPage() {
  const token = await getToken();
  const workflows = await getWorkflows(token);

  if (!workflows) {
    return notFound();
  }
  return <ConnectionSection workflows={workflows} />;
}
