import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import {
  getActionWorkflows,
  getExportWorkflows,
  getImportWorkflows,
} from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import DocumentationSchemaSection from '@/components/documentation/DocumentationSchemaSection';

/**
 * Page to show the schema documentation for the workspace
 */
export default async function DocumentationSchemaPage() {
  const token = await getToken();
  const [
    connections,
    actionWorkflows,
    exportWorkflows,
    importWorkflows,
    repositories,
  ] = await Promise.all([
    getConnections(token),
    getActionWorkflows(token),
    getExportWorkflows(token),
    getImportWorkflows(token),
    getRepositories(token),
  ]);

  return (
    <DocumentationSchemaSection
      connections={connections}
      actions={actionWorkflows}
      exports={exportWorkflows}
      imports={importWorkflows}
      repositories={repositories}
    />
  );
}
