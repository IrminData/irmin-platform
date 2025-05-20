'use client';

import { useCallback } from 'react';

import { Controller, useForm } from 'react-hook-form';

import ConsoleTitle from '@/components/console/ConsoleTitle';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspace } from '@/hooks/useWorkspace';

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
 */
const ManageWorkspacesSection = () => {
  const { dict } = useLocale();
  const { workspacesQuery, createMutation, switchWorkspace } = useWorkspace();

  // Set up react-hook-form
  const { control, handleSubmit, reset } = useForm<CreateWorkspaceFormValues>({
    defaultValues: {
      newWorkspaceName: '',
      newWorkspaceDescription: '',
    },
  });

  const handleCreateWorkspace = useCallback(
    async (data: CreateWorkspaceFormValues) => {
      createMutation.mutate(
        {
          name: data.newWorkspaceName,
          description: data.newWorkspaceDescription,
        },
        {
          onSuccess: () => {
            reset();
          },
        }
      );
    },
    [createMutation, reset]
  );

  if (workspacesQuery.error) {
    return (
      <div className='pattern-bg h-full'>
        <div className='relative container mx-auto max-w-7xl'>
          <div className='flex flex-col'>
            <ConsoleTitle title={dict.workspaceSwitcher.manageWorkspaces} />
            <div className='flex flex-col gap-4 px-4 pb-28'>
              <div className='bg-card border-destructive w-full rounded-lg border px-4 py-8'>
                <p className='text-card-foreground mx-auto mb-2 max-w-lg text-center text-lg lg:text-2xl'>
                  {dict.common.ohNo}
                </p>
                <p className='text-card-foreground/80 mx-auto max-w-lg text-center text-sm'>
                  {(workspacesQuery.error as Error).message}
                </p>
                <div className='mt-4 flex justify-center'>
                  <Button
                    variant='default'
                    onClick={() => window.location.reload()}
                  >
                    {dict.common.tryAgain}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const workspaceList = workspacesQuery.data?.data ?? [];

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
                  className={`${createMutation.isPending && 'blur-xs'}`}
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
                        disabled={createMutation.isPending}
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
                        disabled={createMutation.isPending}
                        {...field}
                      />
                    )}
                  />
                  {createMutation.error && (
                    <p className='text-destructive mb-2'>
                      {(createMutation.error as Error).message}
                    </p>
                  )}
                  <Button
                    variant='gradient'
                    size='sm'
                    className='mb-0 h-11 w-full'
                    type='submit'
                    loading={createMutation.isPending}
                  >
                    {dict.workspaceSwitcher.createNewWorkspace}
                  </Button>
                </form>
              </div>
            </div>
            {/* Display existing workspaces */}
            {!workspacesQuery.isLoading ? (
              <div className='ml-auto grow'>
                <div
                  className={`flex w-full flex-wrap content-stretch items-stretch justify-start ${
                    createMutation.isPending && 'blur-xs'
                  } -mx-2`}
                >
                  {workspaceList.map((workspace: Workspace, idx: number) => (
                    <div
                      className='w-full min-w-1/2 p-2 lg:max-w-60'
                      key={`select-workspace-card-${idx}`}
                    >
                      <WorkspaceCard
                        workspace={workspace}
                        handleClick={switchWorkspace}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='ml-auto grow'>
                <LoadingSkeleton className='h-80 w-full' />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageWorkspacesSection;
