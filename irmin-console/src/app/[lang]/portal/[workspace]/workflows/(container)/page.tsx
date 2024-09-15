'use client';

import PortalTitle from '@/components/portal/PortalTitle';
import WorkflowList from '@/components/workflow/WorkflowList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Portal workflows page
 *
 * @remarks
 *
 * This page is used to manage actions in the portal.
 * It shows a list of actions that are available in the workspace.
 *
 * It uses the WorkspaceContext to fetch and manage action data.
 */
export default function WorkflowsPage() {
  const { dict } = useLocale();
  const { workspaceLoading, workflows: {
    actions,
    imports,
    exports,
  } } = useWorkspace();

  const loading =
    workspaceLoading ||
    actions.isLoading ||
    imports.isLoading ||
    exports.isLoading;

  const workflows = [
    ...actions.actions,
    ...imports.imports,
    ...exports.exports,
  ].sort((a, b) => (a.updated_at > b.updated_at ? -1 : 1));

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.workflows} />
      <WorkflowList loading={loading} workflows={workflows} />
    </>
  );
}
