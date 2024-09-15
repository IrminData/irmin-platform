'use client';

import PortalTitle from '@/components/portal/PortalTitle';
import ImportWorkflowList from '@/components/workflow/import/ImportWorkflowList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page to list and manage Import Workflows
 */
export default function ImportWorkflowsPage() {
  const { dict } = useLocale();
  const {
    workspaceLoading,
    workflows: { imports },
  } = useWorkspace();

  const loading = workspaceLoading || imports.isLoading;

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.imports} />
      <ImportWorkflowList
        loading={loading}
        importWorkflows={imports.imports}
      />
    </>
  );
}
