'use client';

import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { IoAdd } from 'react-icons/io5';

import { inviteInboxQueryKey } from '@/lib/queryKeys';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import { WorkspaceCardSkeleton } from '@/components/ui/loading/WorkspaceCardSkeleton';
import CreateWorkspaceModal from '@/components/workspace/CreateWorkspaceModal';
import PendingInviteCard from '@/components/workspace/PendingInviteCard';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';

import {
  useWorkspaceActions,
  useWorkspaces,
  useWorkspaceSummaries,
} from '@/hooks/api';

import type { Invite } from '@/types/core/Invite';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
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
  const { getCore } = useIrminCore();
  const { switchWorkspace } = useWorkspaceActions();
  const { workspacesQuery } = useWorkspaces();
  const { workspaceSummariesQuery } = useWorkspaceSummaries();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch invite inbox directly (WorkspaceContext is not available at this route)
  const inviteInboxQuery = useQuery<IrminAPIResponse<Invite[]>>({
    queryKey: inviteInboxQueryKey,
    queryFn: async () => {
      const core = await getCore();
      return await core.inviteService.listInviteInbox();
    },
  });

  const pendingInvites = (inviteInboxQuery.data?.data ?? []).filter(
    (invite) => !invite.accepted_at && !invite.declined_at
  );

  // Use the fast workspaces query as primary, fall back to summaries-only
  const workspaceList = workspacesQuery.data?.data ?? [];
  const summaryList = workspaceSummariesQuery.data?.data ?? [];
  const { summaryMap, mostRecentId } = useMemo(() => {
    const map = new Map<string, WorkspaceSummary>();
    let recentId: string | null = null;
    let recentDate: string | null = null;
    for (const s of summaryList) {
      map.set(s.id, s);
      if (s.last_accessed_at && (!recentDate || s.last_accessed_at > recentDate)) {
        recentDate = s.last_accessed_at;
        recentId = s.id;
      }
    }
    return { summaryMap: map, mostRecentId: recentId };
  }, [summaryList]);

  // Only show loading skeleton when both queries are still loading
  const isLoading = workspacesQuery.isLoading;
  // Show error only if the fast query also fails
  const error = workspacesQuery.error;

  if (error) {
    return (
      <SafeComponent
        level='section'
        title='Workspace Error'
        description='Failed to load workspace management'
      >
        <div className='pattern-bg h-full'>
          <div className='relative container mx-auto max-w-3xl px-4 py-28'>
            <QueryError
              error={error}
              onRetry={() => workspacesQuery.refetch()}
              title={dict.workspace.failedToLoadWorkspaces}
              className='py-8'
            />
          </div>
        </div>
      </SafeComponent>
    );
  }

  return (
    <SafeComponent
      level='section'
      title='Workspace Management'
      description='Failed to load workspace management interface'
    >
      <div className='pattern-bg h-full'>
        <div className='relative container mx-auto max-w-4xl px-4 py-12'>
          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div className='mb-6'>
              <h2 className='mb-2 text-lg font-semibold'>
                {dict.invite.pendingInvites}
              </h2>
              <p className='mb-3 text-sm text-muted-foreground'>
                {dict.invite.pendingInvitesDescription}
              </p>
              <div className='flex flex-col gap-2'>
                {pendingInvites.map((invite) => (
                  <PendingInviteCard key={invite.id} invite={invite} />
                ))}
              </div>
            </div>
          )}

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
              {workspaceList.map((workspace, index) => {
                const summary = summaryMap.get(workspace.id);
                return (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    summary={summary}
                    isRecentlyUsed={
                      mostRecentId != null && workspace.id === mostRecentId
                    }
                    handleClick={switchWorkspace}
                  />
                );
              })}
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
