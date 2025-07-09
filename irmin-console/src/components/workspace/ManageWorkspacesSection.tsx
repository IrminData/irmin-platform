'use client';

import { useCallback } from 'react';

import { Controller, useForm } from 'react-hook-form';

import ConsoleTitle from '@/components/console/ConsoleTitle';
import Button from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import QueryError from '@/components/ui/error/QueryError';
import Input from '@/components/ui/input';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaces } from '@/hooks/useWorkspaces';

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
  const { workspacesQuery, createMutation, switchWorkspace } = useWorkspaces();

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
              <QueryError
                error={workspacesQuery.error}
                onRetry={() => workspacesQuery.refetch()}
                title={dict.workspace.failedToLoadWorkspaces}
                className='py-8'
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const workspaceList = workspacesQuery.data?.data ?? [];
  const hasWorkspaces = workspaceList.length > 0;

  // When there are no workspaces, show only the big creation form
  if (!workspacesQuery.isLoading && !hasWorkspaces) {
    return (
      <div className='pattern-bg h-full'>
        <div className='relative container mx-auto max-w-2xl'>
          <div className='flex flex-col items-center justify-center min-h-[60vh] px-4'>
            <ConsoleTitle title={dict.workspaceSwitcher.manageWorkspaces} className="mb-8" />
            
            <div className='w-full max-w-lg'>
              <EmptyState
                title={dict.workspaceSwitcher.createFirstWorkspace}
                description={dict.workspaceSwitcher.createFirstWorkspaceDescription}
                size="lg"
                className="mb-8"
              />
              
              {/* Big creation form */}
              <div className='bg-background text-foreground rounded-xl p-6 shadow-md border'>
                <h2 className="text-xl font-semibold mb-4">{dict.workspaceSwitcher.createNewWorkspace}</h2>
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
                        className='mb-4'
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
                        className='mb-4'
                        disabled={createMutation.isPending}
                        {...field}
                      />
                    )}
                  />
                  {createMutation.error && (
                    <p className='text-destructive mb-4'>
                      {(createMutation.error as Error).message}
                    </p>
                  )}
                  <Button
                    variant='gradient'
                    size='lg'
                    className='h-12 w-full text-base'
                    type='submit'
                    loading={createMutation.isPending}
                  >
                    {dict.workspaceSwitcher.createNewWorkspace}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // When there are workspaces, show the existing layout with both list and form
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
                <div className='-mx-2 flex w-full flex-wrap content-stretch items-stretch justify-start'>
                  <ListSkeleton items={6} className='p-2' />
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
