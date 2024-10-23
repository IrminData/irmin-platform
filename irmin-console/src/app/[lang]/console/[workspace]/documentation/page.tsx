import { getAllCollections } from '@/lib/actions/collections';
import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import {
  getActionWorkflows,
  getExportWorkflows,
  getImportWorkflows,
} from '@/lib/actions/workflows';

import DocumentationSection from '@/components/documentation/DocumentationSection';

/**
 * Page to show the full documentation for the workspace
 */
export default async function DocumentationPage() {
  const [
    connections,
    collections,
    actionWorkflows,
    exportWorkflows,
    importWorkflows,
    repositories,
  ] = await Promise.all([
    getConnections(),
    getAllCollections(),
    getActionWorkflows(),
    getExportWorkflows(),
    getImportWorkflows(),
    getRepositories(),
  ]);

  return (
    <DocumentationSection
      connections={connections}
      collections={collections}
      actions={actionWorkflows}
      exports={exportWorkflows}
      imports={importWorkflows}
      repositories={repositories}
    />
  );
}
