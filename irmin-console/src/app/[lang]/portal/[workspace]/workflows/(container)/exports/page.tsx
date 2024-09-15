'use client';

import PortalTitle from '@/components/portal/PortalTitle';
import ExportWorkflowList from '@/components/workflow/export/ExportWorkflowList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page to list and manage Export Workflows
 */
export default function ExportWorkflowsPage() {
  const { dict } = useLocale();
  const {
    workspaceLoading,
    workflows: { exports },
  } = useWorkspace();

  const loading = workspaceLoading || exports.isLoading;

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.exports} />
      <ExportWorkflowList loading={loading} exportWorkflows={exports.exports} />
    </>
  );
}
