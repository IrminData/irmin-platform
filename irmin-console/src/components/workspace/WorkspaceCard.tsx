'use client';

import { memo, useCallback } from 'react';

import Image from 'next/image';

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
      id='workspace-card'
      className='h-full w-full cursor-pointer transition-all duration-300 hover:scale-95'
      onClick={openWorkspace}
      aria-label={`Go to ${workspace.name} workspace`}
    >
      <div className='bg-card text-card-foreground flex h-full flex-col rounded-xl p-2 text-xs shadow-sm lg:p-4 lg:text-base'>
        <span className='md:text-normal text-irmin_green text-xs font-semibold tracking-wide uppercase'>
          {dict.workspaceSwitcher.workspace}
        </span>
        <h3 className='mt-2 block text-base leading-tight font-normal md:text-lg'>
          {workspace.name}
        </h3>
        <p className='mt-2 mb-4 text-xs leading-tight font-normal opacity-60'>
          {workspace.description ?? '-'}
        </p>
        <div className='grow'></div>
        {workspace.users && workspace.users.length > 0 && (
          <div className='mt-auto flex items-center justify-between gap-0'>
            <div className='flex -space-x-2'>
              {workspace.users.slice(0, 3).map((user, idx) =>
                user.profile_picture ? (
                  <Image
                    key={`select-workspace-card-${workspace.id}-user-${idx}`}
                    src={user.profile_picture}
                    width={30}
                    height={30}
                    alt={`${user.first_name} ${user.last_name}`}
                    className='dark:ring-irmin_black-900 inline-block h-6 w-6 rounded-full ring-1 ring-white'
                  />
                ) : (
                  <div
                    key={`select-workspace-card-${workspace.id}-user-${idx}`}
                    className='bg-background dark:ring-irmin_black-900 relative inline-block rounded-full text-xs ring-1 ring-white'
                  >
                    <ProfileImagePlaceholder
                      user={user}
                      className='h-6 w-6 rounded-full'
                    />
                  </div>
                )
              )}
              {workspace.users.length > 3 && (
                <span className='bg-background z-10 inline-block h-6 w-6 rounded-full text-center text-xs leading-6 font-medium'>
                  +{workspace.users.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(WorkspaceCard);
