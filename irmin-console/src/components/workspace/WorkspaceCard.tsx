'use client';

import { memo, useCallback } from 'react';

import Image from 'next/image';

import { TbBuilding, TbUser } from 'react-icons/tb';

import ProfileImagePlaceholder from '@/components/ui/ProfileImagePlaceholder';

import { useLocale } from '@/context/LocaleContext';

import type { Workspace } from '@/types/core/Workspace';

/**
 * Workspace card component
 *
 * This component is used to display a workspace card in the workspace switcher
 * on the console home page. It displays the workspace name and some details.
 */
const WorkspaceCard = ({
  workspace,
  handleClick,
}: {
  workspace: Workspace;
  handleClick: (_slug: string) => void;
}) => {
  const { dict } = useLocale();
  const openWorkspace = useCallback(() => {
    handleClick(workspace.slug);
  }, [workspace.slug, handleClick]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openWorkspace();
      }
    },
    [openWorkspace]
  );

  return (
    <button
      className={`
        group size-full cursor-pointer border-0 bg-transparent p-0 text-left
        transition-all duration-200
        hover:scale-[1.02]
      `}
      onClick={openWorkspace}
      onKeyDown={handleKeyDown}
      aria-label={`Go to ${workspace.name} workspace`}
    >
      <div
        className={`
          flex h-full min-h-[140px] flex-col rounded-xl border border-border/30
          bg-card p-4 text-card-foreground transition-all duration-200
          group-hover:border-primary/20 group-hover:shadow-sm
        `}
      >
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <span
              className={`
                text-xs font-medium tracking-wide text-irmin-green-500 uppercase
              `}
            >
              {dict.workspaceSwitcher.workspace}
            </span>
            <h3
              className={`
                mt-1 text-lg leading-tight font-semibold text-foreground
              `}
            >
              {workspace.name}
            </h3>
          </div>
          <div
            className={`
              ml-2 rounded-full bg-irmin-green-500/10 p-2 text-irmin-green-500
            `}
          >
            <TbBuilding className='size-4' />
          </div>
        </div>

        <p className='mt-2 mb-4 text-sm leading-relaxed text-muted-foreground'>
          {workspace.description || dict.workspace.noWorkspaceDescription}
        </p>

        <div className='mt-auto'>
          {workspace.users && workspace.users.length > 0 && (
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='flex -space-x-2'>
                  {workspace.users.slice(0, 3).map((user) =>
                    user.profile_picture ? (
                      <Image
                        key={`workspace-${workspace.id}-user-${user.id}`}
                        src={user.profile_picture}
                        width={28}
                        height={28}
                        alt={`${user.first_name} ${user.last_name}`}
                        className={`
                          inline-block size-7 rounded-full ring-2
                          ring-background
                        `}
                      />
                    ) : (
                      <div
                        key={`workspace-${workspace.id}-user-${user.id}`}
                        className={`
                          relative inline-block rounded-full ring-2
                          ring-background
                        `}
                      >
                        <ProfileImagePlaceholder
                          user={user}
                          className='size-7 rounded-full'
                        />
                      </div>
                    )
                  )}
                  {workspace.users.length > 3 && (
                    <div
                      className={`
                        flex size-7 items-center justify-center rounded-full
                        bg-muted text-xs font-medium text-muted-foreground
                        ring-2 ring-background
                      `}
                    >
                      +{workspace.users.length - 3}
                    </div>
                  )}
                </div>
                <span className='text-xs text-muted-foreground'>
                  {workspace.users.length}{' '}
                  {workspace.users.length === 1
                    ? dict.workspace.member
                    : dict.workspace.members}
                </span>
              </div>
            </div>
          )}

          {(!workspace.users || workspace.users.length === 0) && (
            <div className='flex items-center text-xs text-muted-foreground'>
              <TbUser className='mr-1 size-3' />
              {dict.workspace.noMembersYet}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default memo(WorkspaceCard);
