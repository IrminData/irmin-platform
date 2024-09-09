'use client';

import { useMemo } from 'react';

import PortalTitle from '@/components/portal/PortalTitle';
import WorkflowList from '@/components/workflow/WorkflowList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/api/Repository';

/**
 * Section to display the workflows related to the repository.
 */
export default function RepositoryWorkflowsSection({
  repository,
}: {
  repository: Repository;
}) {
  const { dict } = useLocale();
  const {
    actions: { actions, isLoading: isActionsLoading },
    connections: { connections, isLoading: isConnectionsLoading },
    exports: { exports, isLoading: isExportsLoading },
  } = useWorkspace();

  const repositoryActions = useMemo(
    () =>
      actions.filter((workflow) => workflow.repository?.id === repository.id),
    [actions, repository]
  );
  const repositoryConnections = useMemo(
    () =>
      connections.filter(
        (workflow) => workflow.repository?.id === repository.id
      ),
    [connections, repository]
  );
  const repositoryExports = useMemo(
    () =>
      exports.filter(
        (workflow) =>
          workflow.repository?.id === repository.id ||
          workflow.workflowable.source.id === repository.id
      ),
    [exports, repository]
  );
  const isLoading = useMemo(
    () => isActionsLoading || isConnectionsLoading || isExportsLoading,
    [isActionsLoading, isConnectionsLoading, isExportsLoading]
  );

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <PortalTitle title={dict.repository.tabs.workflows} />
      <WorkflowList
        loading={isLoading}
        workflows={[
          ...repositoryActions,
          ...repositoryConnections,
          ...repositoryExports,
        ]}
      />
    </div>
  );
}
