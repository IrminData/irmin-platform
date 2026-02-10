'use client';

import { useState } from 'react';

import { IoAdd } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import { WorkspaceCardSkeleton } from '@/components/ui/loading/WorkspaceCardSkeleton';
import CreateWorkspaceModal from '@/components/workspace/CreateWorkspaceModal';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaceActions, useWorkspaceSummaries } from '@/hooks/api';

import type { WorkspaceSummary } from '@/types/core/Workspace';

/**
 * Manage workspaces UI
 *
 * @remarks
 *
 * Displays a compact list of workspaces with a modal for creating new ones.
 * Uses the lightweight workspace summaries endpoint for fast loading.
 */
const ManageWorkspacesSection = () => {
  const { dict } = useLocale();
  const { switchWorkspace } = useWorkspaceActions();
  const { workspaceSummariesQuery } = useWorkspaceSummaries();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (workspaceSummariesQuery.error) {
    return (
      <SafeComponent
        level='section'
        title='Workspace Error'
        description='Failed to load workspace management'
      >
        <div className='pattern-bg h-full'>
          <div className='relative container mx-auto max-w-3xl px-4 py-28'>
            <QueryError
              error={workspaceSummariesQuery.error}
              onRetry={() => workspaceSummariesQuery.refetch()}
              title={dict.workspace.failedToLoadWorkspaces}
              className='py-8'
            />
          </div>
        </div>
      </SafeComponent>
    );
  }

  const workspaceList = workspaceSummariesQuery.data?.data ?? [];
  const isLoading = workspaceSummariesQuery.isLoading;

  return (
    <SafeComponent
      level='section'
      title='Workspace Management'
      description='Failed to load workspace management interface'
    >
      <div className='pattern-bg h-full'>
        <div className='relative container mx-auto max-w-4xl px-4 py-12'>
          {/* Header */}
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>
              {dict.workspaceSwitcher.selectWorkspace}
            </h2>
            <Button
              variant='gradient'
              size='sm'
              onClick={() => setIsCreateModalOpen(true)}
            >
              <IoAdd className='size-4' />
              {dict.workspaceSwitcher.createNewWorkspace}
            </Button>
          </div>

          {/* Workspace list */}
          {isLoading ? (
            <div
              className={`
                flex flex-col gap-2 divide-y divide-border/50 rounded-xl
              `}
            >
              {Array.from({ length: 6 }, (_, idx) => (
                <WorkspaceCardSkeleton key={`workspace-skeleton-${idx}`} />
              ))}
            </div>
          ) : workspaceList.length === 0 ? (
            <div className='rounded-xl bg-card py-8'>
              <EmptyState
                title={dict.workspaceSwitcher.createFirstWorkspace}
                description={
                  dict.workspaceSwitcher.createFirstWorkspaceDescription
                }
                action={{
                  label: dict.workspaceSwitcher.createNewWorkspace,
                  onClick: () => setIsCreateModalOpen(true),
                }}
              />
            </div>
          ) : (
            <div
              className={`
                flex flex-col gap-2 divide-y divide-border/50 rounded-xl
              `}
            >
              {workspaceList.map(
                (workspace: WorkspaceSummary, index: number) => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    isRecentlyUsed={
                      index === 0 && workspace.last_accessed_at != null
                    }
                    handleClick={switchWorkspace}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create workspace modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        closeModal={() => setIsCreateModalOpen(false)}
      />
    </SafeComponent>
  );
};

export default ManageWorkspacesSection;
