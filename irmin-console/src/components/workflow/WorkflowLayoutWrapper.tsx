'use client';

import { useMemo } from 'react';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { DataProvider } from '@/context/DataContext';
import { useWorkspace } from '@/context/workspace';

import WorkflowLayoutWrapperContent from './WorkflowLayoutWrapperContent';

/**
 * Component to wrap the single Workflows pages in.
 * Wraps the {@link WorkflowLayoutWrapperContent} with the {@link DataProvider} to provide the data context.
 *
 * @param children - The children to render
 */
export default function WorkflowLayoutWrapper({
  children,
  workflowId,
}: {
  children: React.ReactNode;
  workflowId: number;
}) {
  const {
    workspaces: { currentWorkspace },
    workflows: { allWorkflows },
    repositories: { repositories },
  } = useWorkspace();

  const workflow = useMemo(
    () => allWorkflows.find((item) => item.id === workflowId),
    [workflowId, allWorkflows]
  );
  const repository = useMemo(
    () =>
      repositories.find((repo) =>
        workflow?.repository ? repo.id === workflow?.repository.id : undefined
      ),
    [workflow, repositories]
  );

  if (!repository || !workflow) {
    return <LoadingSkeleton />;
  }

  return (
    <DataProvider initialRepository={repository.slug} initialBranch={'main'}>
      <WorkflowLayoutWrapperContent
        workflow={workflow}
        repository={repository}
        currentWorkspace={currentWorkspace}
      >
        {children}
      </WorkflowLayoutWrapperContent>
    </DataProvider>
  );
}
