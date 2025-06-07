'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useResourceAllowed } from '@/hooks/useResourceAllowed';
import { useUsers } from '@/hooks/useUsers';
import { useWorkflow } from '@/hooks/useWorkflow';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

interface WorkflowFormValues {
  name: string;
  description: string;
  cron_syntax: string;
  owner: string;
}

/**
 * Workflow Settings section component
 *
 * Handles workflow settings updates, transferment, deletion, and pausing/resuming.
 * Uses {@link SettingsForm} to show and edit the workflow settings.
 */
const WorkflowSettingsSection = ({ workflowID }: { workflowID: string }) => {
  const { dict } = useLocale();
  const { irminConfirm } = usePopup();
  const { usersQuery } = useUsers();
  const {
    workflowQuery,
    updateWorkflowMutation,
    transferWorkflowMutation,
    deleteWorkflowMutation,
  } = useWorkflow(workflowID);
  const router = useRouter();
  const { workspaceSlug } = useWorkspaceContext();
  const { isResourceAllowed } = useResourceAllowed();
  const handleUpdateWorkflow = useCallback(
    async (data: WorkflowFormValues) => {
      try {
        if (data.owner !== workflowQuery.data?.data?.owner.id) {
          const confirmed = await irminConfirm(
            'warning',
            `${dict.common.areYouSureYouWantToTransferOwnership} (${workflowQuery.data?.data?.name})`
          );
          if (confirmed) {
            await transferWorkflowMutation.mutateAsync(data.owner);
          }
        }
        await updateWorkflowMutation.mutateAsync({
          name: data.name,
          description: data.description,
          documentation: workflowQuery.data?.data?.documentation ?? '',
        });
      } catch (error) {
        console.error('Error updating workflow:', error);
      }
    },
    [
      workflowQuery,
      updateWorkflowMutation,
      transferWorkflowMutation,
      irminConfirm,
      dict,
    ]
  );

  const handleDeleteWorkflow = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${workflowQuery.data?.data?.name})`
    );
    if (!confirmed) return;
    await deleteWorkflowMutation.mutateAsync();
    router.push(`/workspace/${workspaceSlug}/workflows`);
  }, [
    deleteWorkflowMutation,
    irminConfirm,
    workflowQuery.data?.data?.name,
    dict,
    router,
    workspaceSlug,
  ]);

  // Define field configurations
  const fieldConfiguration: FieldConfig<WorkflowFormValues>[] = [
    {
      name: 'name',
      label: dict.common.name,
      type: 'text',
      placeholder: '',
    },
    {
      name: 'description',
      label: dict.common.description,
      type: 'textarea',
      placeholder: '',
    },
    {
      name: 'owner',
      label: dict.list.owner,
      type: 'select',
      options:
        usersQuery.data?.data?.map((user) => ({
          value: user.id,
          label: user.email,
        })) ?? [],
    },
  ];

  if (workflowQuery.isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  if (workflowQuery.isError) {
    return <div>Error: {workflowQuery.error.message}</div>;
  }

  if (!workflowQuery.data?.data) {
    return <div>No data</div>;
  }

  const workflow = workflowQuery.data.data;

  return (
    <div id='workflow-settings-section'>
      <SettingsForm<WorkflowFormValues>
        initialValues={{
          name: workflow.name,
          description: workflow.description,
          owner: workflow.owner.id,
        }}
        onSubmit={handleUpdateWorkflow}
        submitting={
          deleteWorkflowMutation.isPending ||
          updateWorkflowMutation.isPending ||
          transferWorkflowMutation.isPending
        }
        fieldConfiguration={fieldConfiguration}
        deleteItem={handleDeleteWorkflow}
        deleteItemLoading={deleteWorkflowMutation.isPending}
        itemName='Workflow'
        submitButtonLabel={dict.workflow.settings.saveChanges}
        deleteButtonLabel={dict.workflow.settings.delete}
        dangerZoneMessage={dict.workflow.settings.deletionNote}
        disabled={
          !isResourceAllowed(
            PolicyResource.Workflow,
            PolicyAction.Update,
            workflow.id
          )
        }
        deleteButtonDisabled={
          !isResourceAllowed(
            PolicyResource.Workflow,
            PolicyAction.Delete,
            workflow.id
          )
        }
      />
    </div>
  );
};

export default WorkflowSettingsSection;
