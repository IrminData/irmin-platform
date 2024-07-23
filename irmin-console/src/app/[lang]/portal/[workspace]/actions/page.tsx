'use client';

import PortalTitle from '@/components/portalTitle';
import ActionTable from '@/components/tables/actionTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

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
