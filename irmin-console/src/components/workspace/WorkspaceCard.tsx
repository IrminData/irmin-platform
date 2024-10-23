'use client';

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
  return (
    <div
      id='workspace-card'
      className='h-full w-full cursor-pointer transition-all duration-300 hover:scale-95'
      onClick={() => {
        handleClick(workspace.slug);
      }}
      aria-label={`Go to ${workspace.name} workspace`}
    >
      <div className='flex h-full flex-col rounded-xl bg-card p-2 text-xs text-card-foreground shadow lg:p-4 lg:text-base'>
        <span className='md:text-normal text-xs font-semibold uppercase tracking-wide text-irmin_green'>
          {dict.workspaceSwitcher.workspace}
        </span>
        <h3 className='mt-2 block text-base font-normal leading-tight md:text-lg'>
          {workspace.name}
        </h3>
        <p className='mb-4 mt-2 text-xs font-normal leading-tight opacity-60'>
          {workspace.description ?? '-'}
        </p>
        <div className='flex-grow'></div>
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
                    className='inline-block h-6 w-6 rounded-full ring-1 ring-white dark:ring-irmin_black-900'
                  />
                ) : (
                  <div
                    key={`select-workspace-card-${workspace.id}-user-${idx}`}
                    className='relative inline-block rounded-full bg-background text-xs ring-1 ring-white dark:ring-irmin_black-900'
                  >
                    <ProfileImagePlaceholder
                      user={user}
                      className='h-6 w-6 rounded-full'
                    />
                  </div>
                )
              )}
              {workspace.users.length > 3 && (
                <span className='z-10 inline-block h-6 w-6 rounded-full bg-background text-center text-xs font-medium leading-6'>
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

export default WorkspaceCard;
