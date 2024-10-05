'use client';

import { useCallback } from 'react';

import Button from '@/components/common/button/Button';
import SettingsForm, {
  FieldConfig,
} from '@/components/common/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workspace } from '@/types/core/Workspace';

/**
 * General Workspace settings section
 *
 * It allows the user to update the workspace's basic data, such as name,
 * and delete the workspace.
 */
const WorkspaceSettingsSection = () => {
  const { dict } = useLocale();
  const { irminAlert, irminModal } = usePopup();
  const {
    workspaces: {
      currentWorkspace,
      fetchWorkspaces,
      deleteCurrentWorkspace,
      updateWorkspace,
    },
  } = useWorkspace();

  const handleUpdateWorkspace = useCallback(
    async (data: { name: string; description: string }) => {
      if (!currentWorkspace) return;
      try {
        // Call the API to update the workspace
        const res = await updateWorkspace({
          ...currentWorkspace,
          name: data.name.trim(),
          description: data.description.trim(),
        } as Workspace);

        // Fetch the updated workspace data
        await fetchWorkspaces();

        // Show success message
        irminAlert(
          'success',
          res.message ?? dict.workspace.workspaceUpdatedSuccessfully
        );
      } catch (error) {
        console.error('Failed to update workspace:', error);
        irminAlert(
          'error',
          (error as Error)?.message ??
            'Failed to update workspace. Please try again.'
        );
      }
    },
    [currentWorkspace, updateWorkspace, fetchWorkspaces, irminAlert, dict]
  );

  const handleDeleteWorkspace = useCallback(() => {
    if (!currentWorkspace) return;

    const handleDelete = async () => {
      try {
        const res = await deleteCurrentWorkspace();
        irminAlert(
          'success',
          res.message ?? dict.workspace.workspaceDeletedSuccessfully
        );
      } catch (error) {
        console.error('Failed to delete workspace:', error);
        const errorMessage = (error as Error)?.message ?? '';
        irminAlert('error', 'Failed to delete workspace: ' + errorMessage);
      }
    };

    irminModal.show(
      dict.workspace.confirmDeletion,
      <div>
        <p className='mb-4'>{dict.workspace.deletionWarning}</p>
        <div className='flex justify-end'>
          <Button
            onClick={() => {
              irminModal.close();
            }}
            className='mr-4 rounded bg-gray-300 px-4 py-2 text-gray-700 transition-all hover:bg-gray-500'
          >
            {dict.workspace.cancel}
          </Button>
          <Button
            onClick={() => {
              irminModal.close();
              handleDelete();
            }}
            className='rounded bg-red-800 px-4 py-2 text-white transition-all hover:bg-red-500'
          >
            {dict.workspace.delete}
          </Button>
        </div>
      </div>,
      () => {}
    );
  }, [currentWorkspace, deleteCurrentWorkspace, dict, irminModal, irminAlert]);

  // Define field configurations
  const fieldConfiguration: FieldConfig<{
    name: string;
    description: string;
  }>[] = [
    {
      name: 'name',
      label: dict.workspace.workspaceName,
      type: 'text',
      placeholder: '',
    },
    {
      name: 'description',
      label: dict.workspace.workspaceDescription,
      type: 'textarea',
      placeholder: '',
    },
  ];

  return (
    <div
      className='container relative mx-auto my-8 max-w-6xl'
      id='workspace-settings-section'
    >
      {currentWorkspace && (
        <SettingsForm
          initialValues={{
            name: currentWorkspace.name,
            description: currentWorkspace.description ?? '',
          }}
          onSubmit={handleUpdateWorkspace}
          fieldConfiguration={fieldConfiguration}
          deleteItem={handleDeleteWorkspace}
          itemName={dict.consoleNavigation.workspace}
          submitButtonLabel={dict.workspace.saveChanges}
          deleteButtonLabel={dict.workspace.deleteWorkspace}
          dangerZoneMessage={dict.workspace.deletionNote}
        />
      )}
    </div>
  );
};

export default WorkspaceSettingsSection;
