'use client';

import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { IoAdd } from 'react-icons/io5';

import { inviteInboxQueryKey } from '@/lib/queryKeys';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import { WorkspaceCardSkeleton } from '@/components/ui/loading/WorkspaceCardSkeleton';
import CreateWorkspaceModal from '@/components/workspace/CreateWorkspaceModal';
import PendingInviteCard from '@/components/workspace/PendingInviteCard';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';

import { useWorkspaces, useWorkspaceSummaries } from '@/hooks/api';

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

  const { summaryMap, mostRecentId } = useMemo(() => {
    const list = workspaceSummariesQuery.data?.data ?? [];
    const map = new Map<string, WorkspaceSummary>();
    let recentId: string | null = null;
    let recentDate: string | null = null;
    for (const s of list) {
      map.set(s.id, s);
      if (
        s.last_accessed_at &&
        (!recentDate || s.last_accessed_at > recentDate)
      ) {
        recentDate = s.last_accessed_at;
        recentId = s.id;
      }
    }
    return { summaryMap: map, mostRecentId: recentId };
  }, [workspaceSummariesQuery.data?.data]);

  // Sort workspaces so recently used appears first
  const workspaceList = useMemo(() => {
    const workspaceListRaw = workspacesQuery.data?.data ?? [];
    if (!mostRecentId) return workspaceListRaw;
    return [...workspaceListRaw].sort((a, b) => {
      if (a.id === mostRecentId) return -1;
      if (b.id === mostRecentId) return 1;
      return 0;
    });
  }, [workspacesQuery.data?.data, mostRecentId]);

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
        <div className='h-full'>
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
      <div className='h-full'>
        <div className='relative container mx-auto max-w-4xl px-4 py-16'>
          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <section className='mb-10'>
              <h2
                className={`
                  mb-1 text-lg font-semibold tracking-tight text-foreground
                `}
              >
                {dict.invite.pendingInvites}
              </h2>
              <p className='mb-4 text-sm text-muted-foreground'>
                {dict.invite.pendingInvitesDescription}
              </p>
              <div className='flex flex-col gap-2'>
                {pendingInvites.map((invite) => (
                  <PendingInviteCard key={invite.id} invite={invite} />
                ))}
              </div>
            </section>
          )}

          {/* Header */}
          <div
            className={`
              mb-6 flex flex-col gap-4
              sm:flex-row sm:items-end sm:justify-between
            `}
          >
            <div className='min-w-0'>
              <DisplayTitle>
                {dict.workspaceSwitcher.selectWorkspace}
              </DisplayTitle>
              <p className='mt-2 max-w-lg text-sm text-muted-foreground'>
                {workspaceList.length > 0
                  ? (workspaceList.length === 1
                      ? dict.workspaceSwitcher.workspaceCountOne
                      : dict.workspaceSwitcher.workspaceCountOther
                    ).replace('{n}', String(workspaceList.length))
                  : dict.workspaceSwitcher.createFirstWorkspaceDescription}
              </p>
            </div>
            <Button
              variant='gradient'
              size='sm'
              onClick={() => setIsCreateModalOpen(true)}
              className='
                shrink-0 self-start
                sm:self-end
              '
            >
              <IoAdd className='size-4' aria-hidden='true' />
              {dict.workspaceSwitcher.createNewWorkspace}
            </Button>
          </div>

          {/* Workspace list */}
          {isLoading ? (
            <div className='flex flex-col gap-2'>
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
            <div className='flex flex-col gap-2'>
              {workspaceList.map((workspace, _index) => {
                const summary = summaryMap.get(workspace.id);
                return (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    summary={summary}
                    isRecentlyUsed={
                      mostRecentId != null && workspace.id === mostRecentId
                    }
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
