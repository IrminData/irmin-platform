'use client';

import PortalTitle from '@/components/portal/PortalTitle';
import ActionWorkflowList from '@/components/workflow/action/ActionWorkflowList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page to list and manage Action Workflows
 */
export default function ActionWorkflowsPage() {
  const { dict } = useLocale();
  const {
    workspaceLoading,
    workflows: { actions },
  } = useWorkspace();

  const loading = workspaceLoading || actions.isLoading;

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.actions} />
      <ActionWorkflowList loading={loading} actionWorkflows={actions.actions} />
    </>
  );
}
