'use client';

import { useCallback } from 'react';

import { TbLogout } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

/**
 * General Workspace settings section
 *
 * It allows the user to update the workspace's basic data, such as name,
 * and delete the workspace.
 */
const WorkspaceSettingsSection = () => {
  const { dict } = useLocale();
  const {
    workspaceQuery,
    updateMutation,
    confirmDeleteWorkspace,
    confirmLeaveWorkspace,
    deleteMutation,
    leaveMutation,
  } = useWorkspaceContext();

  const { isResourceAllowed } = useResourceAllowed();

  const loading =
    workspaceQuery?.isLoading ||
    updateMutation?.isPending ||
    deleteMutation?.isPending ||
    leaveMutation?.isPending;

  const handleUpdateWorkspace = useCallback(
    async (data: { name: string; description: string }) => {
      await updateMutation?.mutateAsync({
        name: data.name,
        description: data.description,
      });
    },
    [updateMutation]
  );

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

  if (!workspaceQuery?.data) return <></>;

  return (
    <SettingsForm
      initialValues={{
        name: workspaceQuery?.data?.data?.name ?? '',
        description: workspaceQuery?.data?.data?.description ?? '',
      }}
      onSubmit={handleUpdateWorkspace}
      submitting={loading}
      fieldConfiguration={fieldConfiguration}
      deleteItem={confirmDeleteWorkspace}
      deleteItemLoading={deleteMutation?.isPending}
      itemName={dict.consoleNavigation.workspace}
      submitButtonLabel={dict.workspace.saveChanges}
      deleteButtonLabel={dict.workspace.deleteWorkspace}
      dangerZoneMessage={dict.workspace.deletionNote}
      additionalDangerContent={
        <>
          <Button
            onClick={confirmLeaveWorkspace}
            className='mt-4'
            variant='secondary'
            size={'sm'}
            icon={<TbLogout />}
          >
            {dict.workspaceSwitcher.leaveWorkspace}
          </Button>
        </>
      }
      disabled={
        !isResourceAllowed(PolicyResource.Workspace, PolicyAction.Update)
      }
      deleteButtonDisabled={
        !isResourceAllowed(PolicyResource.Workspace, PolicyAction.Delete)
      }
    />
  );
};

export default WorkspaceSettingsSection;
