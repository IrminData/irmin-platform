'use client';

import Image from 'next/image';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workspace } from '@/types/api/Workspace';

/**
 * Workspace card component
 *
 * @remarks
 *
 * This component is used to display a workspace card in the workspace switcher
 * on the portal home page. It displays the workspace name and some details.
 *
 * It allows users to switch to the workspace by clicking on the card.
 */
const WorkspaceCard = ({
  workspace,
  users,
}: {
  workspace: Workspace;
  users: {
    avatar: string;
    name: string;
  }[];
}) => {
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
      className='mx-auto w-full cursor-pointer transition-all duration-300 hover:scale-95'
      onClick={handleWorkspaceCardClick}
      aria-label={`Go to ${workspace.name} workspace`}
    >
      <div className='overflow-hidden rounded-xl bg-white shadow'>
        <div className='p-2 text-xs sm:p-4 lg:p-6 lg:text-base xl:p-8'>
          <span className='md:text-normal text-xs font-semibold uppercase tracking-wide text-irmin_green'>
            {dict.workspaceSwitcher.workspace}
          </span>
          <h3 className='mt-2 block text-base font-normal leading-tight text-irmin_black md:text-lg'>
            {workspace.name}
          </h3>
          <p className='mt-2 text-xs font-light leading-tight text-irmin_blue'>
            {workspace.description ?? '-'}
          </p>
          <div className='mt-4 flex items-center justify-between gap-0'>
            <div className='flex -space-x-2 overflow-hidden'>
              {users.slice(0, 3).map((user, idx) => (
                <Image
                  key={`select-workspace-card-${workspace.id}-user-${idx}`}
                  className='inline-block h-6 w-6 rounded-full ring-2 ring-white'
                  src={user.avatar}
                  width={30}
                  height={30}
                  alt={user.name}
                />
              ))}
              {users.length > 3 && (
                <span className='inline-block h-6 w-6 rounded-full bg-gray-200 text-center text-xs font-medium leading-6 text-irmin_blue'>
                  +{users.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCard;
