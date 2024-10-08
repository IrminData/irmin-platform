'use client';

import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

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
 * It uses the {@link useWorkspace} Context to fetch and manage workspace data.
 *
 * @todo The workspace card shows dummy data for now. This should be replaced with real data.
 */
const ManageWorkspacesSection = () => {
  const { dict } = useLocale();
  const {
    workspaces: {
      workspaces,
      fetchWorkspaces,
      createWorkspace,
      workspacesLoading,
    },
  } = useWorkspace();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const loading = workspacesLoading || processing;

  // Set up react-hook-form
  const { control, handleSubmit, reset } = useForm<CreateWorkspaceFormValues>({
    defaultValues: {
      newWorkspaceName: '',
      newWorkspaceDescription: '',
    },
  });

  const handleCreateWorkspace = async (data: CreateWorkspaceFormValues) => {
    setProcessing(true);
    setError(null);
    setSuccess(null);

    // Create new workspace
    try {
      const res = await createWorkspace(
        data.newWorkspaceName,
        data.newWorkspaceDescription
      );
      await fetchWorkspaces();
      setSuccess(res.message ?? 'Workspace created successfully');
      reset(); // Reset form values
    } catch (error) {
      setError((error as Error)?.message ?? 'Creation failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className='flex flex-col gap-4 px-4 pb-28 lg:flex-row-reverse'>
      {/* Form for creating a new workspace */}
      <div className='w-full pr-4 lg:max-w-80'>
        <div className='rounded-xl bg-background p-2 text-xs text-foreground shadow sm:p-4 lg:p-4 lg:text-base'>
          <p className='mb-4 block text-center text-sm font-normal md:text-base lg:mt-0 lg:text-left'>
            {dict.workspaceSwitcher.createNewWorkspace}
          </p>
          <form
            onSubmit={handleSubmit(handleCreateWorkspace)}
            className={`${loading && 'blur-sm'}`}
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
                  disabled={loading}
                  {...field}
                />
              )}
            />
            <Controller
              name='newWorkspaceDescription'
              control={control}
              rules={{
                required: dict.misc.fieldRequired,
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
                  required
                  className='mb-2 md:mb-4'
                  disabled={loading}
                  {...field}
                />
              )}
            />
            {error && <p className='mb-2 text-destructive'>{error}</p>}
            {success && <p className='mb-2 text-irmin_green'>{success}</p>}
            <Button
              variant='gradient'
              size='sm'
              className='mb-0 h-11 w-full'
              type='submit'
              disabled={loading}
              loading={loading}
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
            className={`flex w-full flex-wrap content-stretch items-stretch justify-start ${loading && 'blur-sm'} -mx-2`}
          >
            {workspaces.map((workspace, idx) => (
              <div
                className='w-1/2 p-2 lg:w-full lg:max-w-60'
                key={`select-workspace-card-${idx}`}
              >
                <WorkspaceCard workspace={workspace} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageWorkspacesSection;
