'use client';

import React from 'react';

import Image from 'next/image';

import { GoDatabase, GoSync } from 'react-icons/go';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workspace } from '@/types/Workspace';

const WorkspaceCard = ({
  workspace,
  description,
  users,
  connectionCount,
  dataSetCount,
}: {
  workspace: Workspace;
  description: string;
  users: {
    avatar: string;
    name: string;
  }[];
  connectionCount: number;
  dataSetCount: number;
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
        <div className='p-2 text-xs lg:p-4 lg:text-base xl:p-8'>
          <span className='md:text-normal text-xs font-semibold uppercase tracking-wide text-irmin_green'>
            {dict.workspaceSwitcher.workspace}
          </span>
          <h3 className='mt-1 block text-lg font-medium leading-tight text-irmin_black md:text-xl'>
            {workspace.name}
          </h3>
          <p className='mt-2 font-light text-irmin_blue'>{description}</p>
          <div className='mt-4'>
            <div className='flex items-center'>
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

            <div className='md:sace-x-4 mt-4 flex w-full space-x-2'>
              <div className='flex items-center'>
                <GoSync className='text-base text-irmin_blue md:h-8' />
                <div className='ml-2 flex flex-col'>
                  <span className='text-sm font-semibold text-irmin_blue'>
                    {connectionCount}
                  </span>
                  <span className='text-xs text-gray-400'>
                    {dict.workspaceSwitcher.connections}
                  </span>
                </div>
              </div>
              <div className='flex items-center'>
                <GoDatabase className='md:h--8 h-6 text-base text-irmin_blue' />
                <div className='ml-2 flex flex-col'>
                  <span className='text-sm font-semibold text-irmin_blue'>
                    {dataSetCount}
                  </span>
                  <span className='text-xs text-gray-400'>
                    {dict.workspaceSwitcher.dataSets}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCard;
