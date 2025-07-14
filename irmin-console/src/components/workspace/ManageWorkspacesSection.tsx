'use client';

import { useCallback } from 'react';

import { Controller, useForm } from 'react-hook-form';

import ConsoleTitle from '@/components/console/ConsoleTitle';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import { Input } from '@/components/ui/input';
import { WorkspaceCardSkeleton } from '@/components/ui/loading/WorkspaceCardSkeleton';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { useLocale } from '@/context/LocaleContext';

import { useWorkspaces } from '@/hooks/useWorkspaces';

import type { Workspace } from '@/types/core/Workspace';

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
      <SafeComponent
        level='section'
        title='Workspace Error'
        description='Failed to load workspace management'
      >
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
      </SafeComponent>
    );
  }

  const workspaceList = workspacesQuery.data?.data ?? [];
  const hasWorkspaces = workspaceList.length > 0;

  // When there are no workspaces, show only the big creation form
  if (!workspacesQuery.isLoading && !hasWorkspaces) {
    return (
      <SafeComponent
        level='section'
        title='Workspace Creation'
        description='Failed to load workspace creation form'
      >
        <div className='pattern-bg h-full'>
          <div className='relative container mx-auto max-w-2xl'>
            <div
              className={`
                flex min-h-[60vh] flex-col items-center justify-center px-4
              `}
            >
              <ConsoleTitle
                title={dict.workspaceSwitcher.manageWorkspaces}
                className='mb-8'
              />

              <div className='w-full max-w-lg'>
                <EmptyState
                  title={dict.workspaceSwitcher.createFirstWorkspace}
                  description={
                    dict.workspaceSwitcher.createFirstWorkspaceDescription
                  }
                  size='lg'
                  className='mb-8'
                />

                {/* Big creation form */}
                <div
                  className={`
                    rounded-xl border bg-background p-6 text-foreground
                    shadow-md
                  `}
                >
                  <h2 className='mb-4 text-xl font-semibold'>
                    {dict.workspaceSwitcher.createNewWorkspace}
                  </h2>
                  <form
                    onSubmit={handleSubmit(handleCreateWorkspace)}
                    className={`
                      ${createMutation.isPending && 'blur-xs'}
                    `}
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
                      <p className='mb-4 text-destructive'>
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
      </SafeComponent>
    );
  }

  // When there are workspaces, show the redesigned layout
  return (
    <SafeComponent
      level='section'
      title='Workspace Management'
      description='Failed to load workspace management interface'
    >
      <div className='pattern-bg h-full'>
        <div className='relative container mx-auto max-w-7xl'>
          <div className='flex flex-col'>
            <div className='px-4 py-28'>
              <div className='flex flex-col gap-8'>
                {/* Workspace cards grid - on top */}
                <div className='min-w-0 flex-1'>
                  <h2 className='mb-6 text-lg font-semibold'>
                    {dict.workspaceSwitcher.selectWorkspace}
                  </h2>
                  {!workspacesQuery.isLoading ? (
                    <div
                      className={`
                        ${createMutation.isPending && 'blur-xs'}
                      `}
                    >
                      <div
                        className={`
                          grid grid-cols-1 gap-4
                          sm:grid-cols-2
                          xl:grid-cols-3
                        `}
                      >
                        {workspaceList.map((workspace: Workspace) => (
                          <WorkspaceCard
                            key={workspace.id}
                            workspace={workspace}
                            handleClick={switchWorkspace}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`
                        grid grid-cols-1 gap-4
                        sm:grid-cols-2
                        xl:grid-cols-3
                      `}
                    >
                      {Array.from({ length: 6 }, (_, idx) => (
                        <WorkspaceCardSkeleton
                          key={`workspace-skeleton-${idx}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Create workspace form - below */}
                <div className='w-full max-w-2xl'>
                  <div className='rounded-xl bg-card p-6 ring-1 ring-border/20'>
                    <h2 className='mb-6 text-lg font-semibold'>
                      {dict.workspaceSwitcher.createNewWorkspace}
                    </h2>
                    <form
                      onSubmit={handleSubmit(handleCreateWorkspace)}
                      className={`
                        space-y-4
                        ${createMutation.isPending && `blur-xs`}
                      `}
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
                            disabled={createMutation.isPending}
                            className='border-border/50 bg-background/50'
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
                            disabled={createMutation.isPending}
                            className='border-border/50 bg-background/50'
                            {...field}
                          />
                        )}
                      />
                      <Button
                        variant='gradient'
                        size='lg'
                        className='w-full'
                        type='submit'
                        loading={createMutation.isPending}
                      >
                        {dict.workspaceSwitcher.createNewWorkspace}
                      </Button>
                    </form>
                    {createMutation.error && (
                      <p className='mt-4 text-sm text-destructive'>
                        {(createMutation.error as Error).message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SafeComponent>
  );
};

export default ManageWorkspacesSection;
