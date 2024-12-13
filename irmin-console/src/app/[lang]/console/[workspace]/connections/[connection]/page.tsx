import { notFound } from 'next/navigation';

import {
  getExportWorkflows,
  getImportWorkflows,
} from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import ConnectionSection from '@/components/connection/ConnectionSection';

/**
 * Page for the Connection overview
 */
export default async function ConnectionOverviewPage() {
  const token = await getToken();
  const [importWorkflows, exportWorkflows] = await Promise.all([
    getImportWorkflows(token),
    getExportWorkflows(token),
  ]);
  if (!importWorkflows || !exportWorkflows) {
    return notFound();
  }
  return (
    <ConnectionSection
      importWorkflows={importWorkflows}
      exportWorkflows={exportWorkflows}
    />
  );
}
