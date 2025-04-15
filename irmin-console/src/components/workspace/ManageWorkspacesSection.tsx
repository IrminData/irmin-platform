'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Controller, useForm } from 'react-hook-form';

import { getWorkspaces } from '@/lib/actions/workspaces';

import ConsoleTitle from '@/components/console/ConsoleTitle';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { useLocale } from '@/context/LocaleContext';
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
 */
const ManageWorkspacesSection = ({
  initialWorkspaces,
}: {
  initialWorkspaces: Workspace[];
}) => {
  const { irminAlert } = usePopup();
  const { dict, locale } = useLocale();
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
      const newWorkspaces = await getWorkspaces({});
      setWorkspaces(newWorkspaces.data ?? []);
      setProcessing(false);
    },
    [handleCreate]
  );

  const handleSwitchWorkspace = useCallback(
    async (slug: string) => {
      try {
        router.push(`/${locale}/workspace/${slug}`);
      } catch (error) {
        console.error('Failed to switch workspace: ', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to switch workspace'
        );
      }
    },
    [router, irminAlert, locale]
  );

  return (
    <div className='pattern-bg h-full'>
      <div className='relative container mx-auto max-w-7xl'>
        <div className='flex flex-col'>
          <ConsoleTitle title={dict.workspaceSwitcher.manageWorkspaces} />
          <div className='flex flex-col gap-4 px-4 pb-28 lg:flex-row-reverse'>
            {/* Form for creating a new workspace */}
            <div className='w-full pr-4 lg:max-w-80'>
              <div className='bg-background text-foreground rounded-xl p-2 text-xs shadow-xs sm:p-4 lg:p-4 lg:text-base'>
                <form
                  onSubmit={handleSubmit(handleCreateWorkspace)}
                  className={`${processing && 'blur-xs'}`}
                >
                  <Controller
                    name='newWorkspaceName'
                    control={control}
                    rules={{ required: dict.common.fieldRequired }}
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
                        message: dict.common.fieldInvalid,
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
                    <p className='text-destructive mb-2'>{errorMessage}</p>
                  )}
                  {successMessage && (
                    <p className='text-irmin_green mb-2'>{successMessage}</p>
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
              <div className='ml-auto grow'>
                <div
                  className={`flex w-full flex-wrap content-stretch items-stretch justify-start ${processing && 'blur-xs'} -mx-2`}
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
        </div>
      </div>
    </div>
  );
};

export default ManageWorkspacesSection;
