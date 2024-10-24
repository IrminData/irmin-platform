'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Controller, useForm } from 'react-hook-form';

import { getWorkspaces, switchWorkspace } from '@/lib/actions/workspaces';
import { Dictionary } from '@/lib/dict';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { usePopup } from '@/context/PopupContext';

import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';

import { Workspace } from '@/types/core/Workspace';

/**
 * Define form values type for react-hook-form
 */
interface CreateWorkspaceFormValues {
  newWorkspaceName: string;
  newWorkspaceDescription: string;
}

/**
 * Manage workspaces UI
 *
 * @remarks
 *
 * This component is used to manage workspaces in the console.
 * Here, users can create new workspaces and navigate to existing ones.
 *
 * @param props - The component props
 * @param props.initialWorkspaces - The initial workspaces to display
 * @param props.dict - Dictionary for translations
 */
const ManageWorkspacesSection = ({
  initialWorkspaces,
  dict,
}: {
  initialWorkspaces: Workspace[];
  dict: Dictionary;
}) => {
  const { irminAlert } = usePopup();
  const router = useRouter();

  const [processing, setProcessing] = useState(false);
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);

  // Set up react-hook-form
  const { control, handleSubmit, reset } = useForm<CreateWorkspaceFormValues>({
    defaultValues: {
      newWorkspaceName: '',
      newWorkspaceDescription: '',
    },
  });

  const { handleCreate, successMessage, errorMessage } = useCreateWorkspace({
    reset,
  });

  const handleCreateWorkspace = useCallback(
    async (data: CreateWorkspaceFormValues) => {
      setProcessing(true);
      // Create the workspace
      await handleCreate(data.newWorkspaceName, data.newWorkspaceDescription);
      // Refetch the workspaces
      const newWorkspaces = await getWorkspaces();
      setWorkspaces(newWorkspaces);
      setProcessing(false);
    },
    [handleCreate]
  );

  const handleSwitchWorkspace = useCallback(
    async (slug: string) => {
      try {
        const res = await switchWorkspace(slug);
        irminAlert(
          'success',
          res?.message ?? 'Workspace switched successfully'
        );
        router.push(`/console/${slug}`);
      } catch (error) {
        console.error('Failed to switch workspace: ', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to switch workspace'
        );
      }
    },
    [router, irminAlert]
  );

  return (
    <div className='flex flex-col gap-4 px-4 pb-28 lg:flex-row-reverse'>
      {/* Form for creating a new workspace */}
      <div className='w-full pr-4 lg:max-w-80'>
        <div className='rounded-xl bg-background p-2 text-xs text-foreground shadow sm:p-4 lg:p-4 lg:text-base'>
          <form
            onSubmit={handleSubmit(handleCreateWorkspace)}
            className={`${processing && 'blur-sm'}`}
          >
            <Controller
              name='newWorkspaceName'
              control={control}
              rules={{ required: dict.misc.fieldRequired }}
              render={({ field }) => (
                <Input
                  type='text'
                  placeholder={dict.workspace.workspaceName}
                  required
                  className='mb-2 md:mb-4'
                  disabled={processing}
                  {...field}
                />
              )}
            />
            <Controller
              name='newWorkspaceDescription'
              control={control}
              rules={{
                maxLength: {
                  value: 255,
                  message: dict.misc.fieldInvalid,
                },
              }}
              render={({ field }) => (
                <Input
                  type='text'
                  placeholder={dict.workspace.workspaceDescription}
                  maxLength={255}
                  longtext={{
                    rows: 3,
                  }}
                  className='mb-2 md:mb-4'
                  disabled={processing}
                  {...field}
                />
              )}
            />
            {errorMessage && (
              <p className='mb-2 text-destructive'>{errorMessage}</p>
            )}
            {successMessage && (
              <p className='mb-2 text-irmin_green'>{successMessage}</p>
            )}
            <Button
              variant='gradient'
              size='sm'
              className='mb-0 h-11 w-full'
              type='submit'
              disabled={processing}
              loading={processing}
            >
              {dict.workspaceSwitcher.createNewWorkspace}
            </Button>
          </form>
        </div>
      </div>
      {/* Display existing workspaces */}
      {workspaces.length > 0 && (
        <div className='ml-auto flex-grow'>
          <div
            className={`flex w-full flex-wrap content-stretch items-stretch justify-start ${processing && 'blur-sm'} -mx-2`}
          >
            {workspaces.map((workspace, idx) => (
              <div
                className='w-1/2 p-2 lg:w-full lg:max-w-60'
                key={`select-workspace-card-${idx}`}
              >
                <WorkspaceCard
                  workspace={workspace}
                  handleClick={handleSwitchWorkspace}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageWorkspacesSection;
