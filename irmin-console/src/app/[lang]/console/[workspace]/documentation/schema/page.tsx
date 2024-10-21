import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import {
  getActionWorkflows,
  getExportWorkflows,
  getImportWorkflows,
} from '@/lib/actions/workflows';

import DocumentationSchemaSection from '@/components/documentation/DocumentationSchemaSection';

/**
 * Page to show the schema documentation for the workspace
 */
export default async function DocumentationSchemaPage() {
  const [
    connections,
    actionWorkflows,
    exportWorkflows,
    importWorkflows,
    repositories,
  ] = await Promise.all([
    getConnections(),
    getActionWorkflows(),
    getExportWorkflows(),
    getImportWorkflows(),
    getRepositories(),
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
