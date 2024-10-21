import {
  getExportWorkflows,
  getImportWorkflows,
} from '@/lib/actions/workflows';

import ConnectionSection from '@/components/connection/ConnectionSection';

/**
 * Page for the Connection overview
 */
export default async function ConnectionOverviewPage() {
  const [importWorkflows, exportWorkflows] = await Promise.all([
    getImportWorkflows(),
    getExportWorkflows(),
  ]);
  return (
    <ConnectionSection
      importWorkflows={importWorkflows}
      exportWorkflows={exportWorkflows}
    />
  );
}
