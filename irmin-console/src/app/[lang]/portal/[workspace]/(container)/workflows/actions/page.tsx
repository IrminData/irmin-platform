'use client';

import NormalListSkeleton from '@/components/common/list/NormalList/Skeleton';
import PortalTitle from '@/components/portal/PortalTitle';
import ActionWorkflowList from '@/components/workflow/action/ActionWorkflowList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Portal actions page
 *
 * @remarks
 *
 * This page is used to manage actions in the portal.
 * It shows a list of actions that are available in the workspace.
 *
 * It uses the WorkspaceContext to fetch and manage action data.
 */
export default function ActionsPage() {
  const { dict } = useLocale();
  const { workspaceLoading, actions } = useWorkspace();

  const loading = workspaceLoading || actions.isLoading;

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.actions} />
      {loading ? (
        <NormalListSkeleton />
      ) : (
        <ActionWorkflowList actionWorkflows={actions.actions} />
      )}
    </>
  );
}
