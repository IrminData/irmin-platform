'use client';

import { useCallback } from 'react';

import { TbLogout } from 'react-icons/tb';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import Button from '../ui/button';

/**
 * General Workspace settings section
 *
 * It allows the user to update the workspace's basic data, such as name,
 * and delete the workspace.
 */
const WorkspaceSettingsSection = () => {
  const { dict } = useLocale();
  const { workspace, updateWorkspace, deleteWorkspace, leaveWorkspace } =
    useWorkspace();

  const handleUpdateWorkspace = useCallback(
    async (data: { name: string; description: string }) => {
      await updateWorkspace({
        name: data.name,
        description: data.description,
      });
    },
    [updateWorkspace]
  );

  const handleDeleteWorkspace = useCallback(async () => {
    await deleteWorkspace();
  }, [deleteWorkspace]);

  const handleLeaveWorkspace = useCallback(async () => {
    await leaveWorkspace();
  }, [deleteWorkspace]);

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
      {workspace && (
        <SettingsForm
          initialValues={{
            name: workspace.name,
            description: workspace.description ?? '',
          }}
          onSubmit={handleUpdateWorkspace}
          fieldConfiguration={fieldConfiguration}
          deleteItem={handleDeleteWorkspace}
          itemName={dict.consoleNavigation.workspace}
          submitButtonLabel={dict.workspace.saveChanges}
          deleteButtonLabel={dict.workspace.deleteWorkspace}
          dangerZoneMessage={dict.workspace.deletionNote}
          additionalDangerContent={
            <>
              <Button
                onClick={handleLeaveWorkspace}
                className='mt-4'
                variant='secondary'
                size={'sm'}
                icon={<TbLogout />}
              >
                {dict.workspaceSwitcher.leaveWorkspace}
              </Button>
            </>
          }
        />
      )}
    </div>
  );
};

export default WorkspaceSettingsSection;
