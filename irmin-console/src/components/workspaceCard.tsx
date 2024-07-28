'use client';

import React from 'react';

import Image from 'next/image';

import { GoDatabase, GoPlay, GoSync } from 'react-icons/go';

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
  description,
  users,
  connectionCount,
  datasetCount,
  actionCount,
}: {
  workspace: Workspace;
  description: string;
  users: {
    avatar: string;
    name: string;
  }[];
  connectionCount: number;
  datasetCount: number;
  actionCount: number;
}) => {
  const { dict } = useLocale();

  const { irminAlert } = usePopup();
  const { switchToWorkspace, workspaceLoading } = useWorkspace();

  return (
    <div
      id='workspace-card'
      className='mx-auto w-full cursor-pointer transition-all duration-300 hover:scale-95'
      onClick={async (e) => {
        e.preventDefault();
        if (workspaceLoading) return;
        try {
          localStorage.setItem('currentWorkspaceSlug', workspace.slug);
          await switchToWorkspace(workspace.slug);
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
      }}
      aria-label={`Go to ${workspace.name} workspace`}
    >
      <div className='overflow-hidden rounded-xl bg-white shadow'>
        <div className='p-4 text-xs lg:p-6 lg:text-base xl:p-8'>
          <span className='md:text-normal text-xs font-semibold uppercase tracking-wide text-irmin_green'>
            {dict.workspaceSwitcher.workspace}
          </span>
          <h3 className='mt-1 block text-base font-medium leading-tight text-irmin_black md:text-lg'>
            {workspace.name}
          </h3>
          <p className='mt-2 text-xs font-light leading-tight text-irmin_blue'>
            {description}
          </p>
          <div className='mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-2'>
            <div className='flex flex-col items-start gap-1'>
              <div className='flex flex-col items-start gap-1'>
                <p className='w-full text-sm font-medium text-irmin_blue'>
                  <GoSync className='mr-1 inline h-3 text-gray-400' />
                  {connectionCount}
                  <span className='inline pl-1 text-xs font-light text-gray-400'>
                    {dict.workspaceSwitcher.connections}
                  </span>
                </p>
              </div>
              <div className='flex flex-col items-start gap-1'>
                <p className='w-full text-sm font-medium text-irmin_blue'>
                  <GoDatabase className='mr-1 inline h-3 text-gray-400' />
                  {datasetCount}
                  <span className='inline pl-1 text-xs font-light text-gray-400'>
                    {dict.workspaceSwitcher.datasets}
                  </span>
                </p>
              </div>
              <div className='flex flex-col items-start gap-1'>
                <p className='w-full text-sm font-medium text-irmin_blue'>
                  <GoPlay className='mr-1 inline h-3 text-gray-400' />
                  {actionCount}
                  <span className='inline pl-1 text-xs font-light text-gray-400'>
                    {dict.workspaceSwitcher.actions}
                  </span>
                </p>
              </div>
            </div>
            <div className='flex items-center justify-between gap-0'>
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
    </div>
  );
};

export default WorkspaceCard;
