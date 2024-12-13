import { notFound } from 'next/navigation';

import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';
import {
  getActionWorkflows,
  getExportWorkflows,
  getImportWorkflows,
} from '@/lib/actions/workflows';
import { getToken } from '@/lib/getToken';

import DocumentationSection from '@/components/documentation/DocumentationSection';

/**
 * Page to show the full documentation for the workspace
 */
export default async function DocumentationPage() {
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

  if (
    !connections ||
    !actionWorkflows ||
    !exportWorkflows ||
    !importWorkflows ||
    !repositories
  ) {
    return notFound();
  }

  return (
    <DocumentationSection
      connections={connections}
      actions={actionWorkflows}
      exports={exportWorkflows}
      imports={importWorkflows}
      repositories={repositories}
    />
  );
}
