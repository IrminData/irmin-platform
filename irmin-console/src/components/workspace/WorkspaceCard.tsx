'use client';

import Image from 'next/image';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workspace } from '@/types/core/Workspace';

import ProfileImagePlaceholder from '../common/ProfileImagePlaceholder';

/**
 * Workspace card component
 *
 * @remarks
 *
 * This component is used to display a workspace card in the workspace switcher
 * on the console home page. It displays the workspace name and some details.
 *
 * It allows users to switch to the workspace by clicking on the card.
 */
const WorkspaceCard = ({ workspace }: { workspace: Workspace }) => {
  const { dict } = useLocale();

  const { irminAlert } = usePopup();
  const {
    workspaces: { switchWorkspace },
  } = useWorkspace();

  const handleWorkspaceCardClick = async (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    try {
      await switchWorkspace(workspace.slug);
      irminAlert(
        'success',
        `${dict.workspaceSwitcher.switchedTo}: ${workspace.name}`
      );
    } catch (error) {
      console.error('Failed to switch workspace: ', error);
      const errorMessage = (error as Error)?.message ?? '';
      irminAlert(
        'error',
        `${dict.workspaceSwitcher.failedToSwitch}: ` + errorMessage
      );
    }
  };

  return (
    <div
      id='workspace-card'
      className='h-full w-full cursor-pointer transition-all duration-300 hover:scale-95'
      onClick={handleWorkspaceCardClick}
      aria-label={`Go to ${workspace.name} workspace`}
    >
      <div className='flex h-full flex-col rounded-xl bg-white p-2 text-xs shadow lg:p-4 lg:text-base dark:bg-irmin_black-600'>
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
            <div className='flex -space-x-2 overflow-hidden'>
              {workspace.users
                .slice(0, 3)
                .map((user, idx) =>
                  user.profile_picture ? (
                    <Image
                      key={`select-workspace-card-${workspace.id}-user-${idx}`}
                      src={user.profile_picture}
                      width={30}
                      height={30}
                      alt={user.name}
                      className='inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-irmin_black-900'
                    />
                  ) : (
                    <ProfileImagePlaceholder
                      key={`select-workspace-card-${workspace.id}-user-${idx}`}
                      user={user}
                      className='inline-block h-6 w-6 rounded-full text-xs ring-2 ring-white dark:ring-irmin_black-900'
                    />
                  )
                )}
              {workspace.users.length > 3 && (
                <span className='z-10 inline-block h-6 w-6 rounded-full bg-gray-200 text-center text-xs font-medium leading-6 dark:bg-gray-800'>
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
