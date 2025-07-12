'use client';

import { memo, useCallback } from 'react';

import Image from 'next/image';

import { TbBuilding, TbUser } from 'react-icons/tb';

import ProfileImagePlaceholder from '@/components/ui/ProfileImagePlaceholder';

import { useLocale } from '@/context/LocaleContext';

import { Workspace } from '@/types/core/Workspace';

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
  handleClick: (slug: string) => void;
}) => {
  const { dict } = useLocale();
  const openWorkspace = useCallback(() => {
    handleClick(workspace.slug);
  }, [workspace.slug, handleClick]);

  return (
    <div
      className='group h-full w-full cursor-pointer transition-all duration-200 hover:scale-[1.02]'
      onClick={openWorkspace}
      aria-label={`Go to ${workspace.name} workspace`}
    >
      <div className='bg-card text-card-foreground border-border/30 group-hover:border-primary/20 flex h-full min-h-[140px] flex-col rounded-xl border p-4 transition-all duration-200 group-hover:shadow-sm'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <span className='text-irmin_green text-xs font-medium tracking-wide uppercase'>
              {dict.workspaceSwitcher.workspace}
            </span>
            <h3 className='text-foreground mt-1 text-lg leading-tight font-semibold'>
              {workspace.name}
            </h3>
          </div>
          <div className='bg-irmin_green/10 text-irmin_green ml-2 rounded-full p-2'>
            <TbBuilding className='h-4 w-4' />
          </div>
        </div>

        <p className='text-muted-foreground mt-2 mb-4 text-sm leading-relaxed'>
          {workspace.description || dict.workspace.noWorkspaceDescription}
        </p>

        <div className='mt-auto'>
          {workspace.users && workspace.users.length > 0 && (
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='flex -space-x-2'>
                  {workspace.users.slice(0, 3).map((user, idx) =>
                    user.profile_picture ? (
                      <Image
                        key={`workspace-${workspace.id}-user-${idx}`}
                        src={user.profile_picture}
                        width={28}
                        height={28}
                        alt={`${user.first_name} ${user.last_name}`}
                        className='ring-background inline-block h-7 w-7 rounded-full ring-2'
                      />
                    ) : (
                      <div
                        key={`workspace-${workspace.id}-user-${idx}`}
                        className='ring-background relative inline-block rounded-full ring-2'
                      >
                        <ProfileImagePlaceholder
                          user={user}
                          className='h-7 w-7 rounded-full'
                        />
                      </div>
                    )
                  )}
                  {workspace.users.length > 3 && (
                    <div className='bg-muted text-muted-foreground ring-background flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ring-2'>
                      +{workspace.users.length - 3}
                    </div>
                  )}
                </div>
                <span className='text-muted-foreground text-xs'>
                  {workspace.users.length}{' '}
                  {workspace.users.length === 1
                    ? dict.workspace.member
                    : dict.workspace.members}
                </span>
              </div>
            </div>
          )}

          {(!workspace.users || workspace.users.length === 0) && (
            <div className='text-muted-foreground flex items-center text-xs'>
              <TbUser className='mr-1 h-3 w-3' />
              {dict.workspace.noMembersYet}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(WorkspaceCard);
