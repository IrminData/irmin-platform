'use client';

import PortalTitle from '@/components/portalTitle';
import ActionTable from '@/components/tables/actionTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

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
 *
 * @returns UI for managing actions
 */
export default function ActionsPage() {
  const { dict } = useLocale();
  const { actions } = useWorkspace();

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.actions} />
      {actions.isLoading ? (
        <TableSkeleton />
      ) : (
        <ActionTable actions={actions.actions} />
      )}
    </>
  );
}
