import { useCallback, useState } from 'react';

import PolicyForm from '@/components/ui/policy-editor/PolicyForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  usePolicies,
  usePolicyResourceOptions,
  useRoles,
  useUsers,
} from '@/hooks/api';

import type { Policy } from '@/types/core/Policy';

import type {
  PolicyBatchFormData,
  PolicyFormData,
  UsePolicyFormProps,
  UsePolicyFormReturn,
} from './types';

export function usePolicyForm({
  defaultResourceType,
  defaultResourceId,
  defaultPrincipalType,
  defaultRoleId,
  defaultUserId,
}: UsePolicyFormProps): UsePolicyFormReturn {
  const { dict } = useLocale();
  const { irminModal, irminAlert } = usePopup();
  const { createPolicyMutation, updatePolicyMutation } = usePolicies({
    mutationsOnly: true,
  });
  const { createPolicyMutation: batchCreateMutation } = usePolicies({
    silent: true,
    mutationsOnly: true,
  });
  const { rolesQuery } = useRoles();
  const { usersQuery } = useUsers();
  const { policyResourceOptionsQuery } = usePolicyResourceOptions();
  const [isBatchCreating, setIsBatchCreating] = useState(false);

  const handleCreatePolicy = useCallback(
    (formData: PolicyFormData) => {
      const createData = {
        effect: formData.effect,
        action: formData.action,
        resource: formData.resource,
        principal: formData.principal,
        resourceId: formData.resourceId || '',
        roleId: formData.principal === 'role' ? formData.roleId : undefined,
        userId:
          formData.principal === 'workspace_user' ? formData.userId : undefined,
      };

      createPolicyMutation.mutate(createData, {
        onSuccess: () => {
          irminModal.close();
        },
      });
    },
    [createPolicyMutation, irminModal]
  );

  const handleBatchCreatePolicy = useCallback(
    async (formData: PolicyBatchFormData) => {
      const { actions, resources, ...rest } = formData;

      // Cartesian product of actions × resources
      const combinations = actions.flatMap((action) =>
        resources.map((resource) => ({
          effect: rest.effect,
          action,
          resource,
          principal: rest.principal,
          resourceId: rest.resourceId || '',
          roleId: rest.principal === 'role' ? rest.roleId : undefined,
          userId: rest.principal === 'workspace_user' ? rest.userId : undefined,
        }))
      );

      if (combinations.length === 0) {
        irminAlert('error', dict.policy.batchNoSelections);
        return;
      }

      setIsBatchCreating(true);
      const results = await Promise.allSettled(
        combinations.map((data) => batchCreateMutation.mutateAsync(data))
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const alreadyExisted = results.filter(
        (r) =>
          r.status === 'rejected' &&
          r.reason instanceof Error &&
          r.reason.message.toLowerCase().includes('already exists')
      ).length;
      const failed =
        results.filter((r) => r.status === 'rejected').length - alreadyExisted;

      const skippedNote =
        alreadyExisted > 0
          ? ` (${String(alreadyExisted)} ${dict.policy.alreadyExisted})`
          : '';

      if (failed > 0) {
        irminAlert(
          'error',
          `${dict.policy.createdPolicies}: ${String(succeeded)} / ${String(combinations.length)}. ${String(failed)} ${dict.policy.failedCount}.${skippedNote}`
        );
      } else {
        irminAlert(
          'success',
          `${dict.policy.createdPolicies}: ${String(succeeded)} / ${String(combinations.length)}${skippedNote}`
        );
        irminModal.close();
      }

      setIsBatchCreating(false);
    },
    [
      batchCreateMutation,
      irminModal,
      irminAlert,
      dict.policy.createdPolicies,
      dict.policy.failedCount,
      dict.policy.alreadyExisted,
      dict.policy.batchNoSelections,
    ]
  );

  const handleUpdatePolicy = useCallback(
    (policy: Policy) => (formData: PolicyFormData) => {
      const updateData = {
        policyId: policy?.id,
        effect: formData.effect,
        action: formData.action,
        resource: formData.resource,
        principal: formData.principal,
        resourceId: formData.resourceId || undefined,
        roleId: formData.principal === 'role' ? formData.roleId : undefined,
        userId:
          formData.principal === 'workspace_user' ? formData.userId : undefined,
      };

      updatePolicyMutation.mutate(updateData, {
        onSuccess: () => {
          irminModal.close();
        },
      });
    },
    [updatePolicyMutation, irminModal]
  );

  const showCreateForm = useCallback(() => {
    const initialValues: PolicyFormData = {
      effect: 'allow',
      action: 'read',
      resource: defaultResourceType || 'workspace',
      resourceId: defaultResourceId,
      principal: defaultPrincipalType || 'role',
      roleId: defaultRoleId,
      userId: defaultUserId,
    };

    irminModal.show(
      dict.policy.createPolicy,
      <PolicyForm
        isEditMode={false}
        initialValues={initialValues}
        onSubmit={handleCreatePolicy}
        onBatchSubmit={handleBatchCreatePolicy}
        isLoading={
          rolesQuery.isPending ||
          usersQuery.isPending ||
          policyResourceOptionsQuery.isPending
        }
        isSubmitting={createPolicyMutation.isPending || isBatchCreating}
        onCancel={() => {
          irminModal.close();
        }}
        roles={rolesQuery.data?.data ?? []}
        users={usersQuery.data?.data ?? []}
        policyResourceOptions={
          policyResourceOptionsQuery.data?.data ?? {
            queries: [],
            scripts: [],
            workflows: [],
            connections: [],
            repositories: [],
            users: [],
            tags: [],
          }
        }
      />
    );
  }, [
    dict.policy.createPolicy,
    irminModal,
    rolesQuery,
    usersQuery,
    policyResourceOptionsQuery,
    handleCreatePolicy,
    handleBatchCreatePolicy,
    createPolicyMutation.isPending,
    isBatchCreating,
    defaultResourceType,
    defaultResourceId,
    defaultPrincipalType,
    defaultRoleId,
    defaultUserId,
  ]);

  const showEditForm = useCallback(
    (policy: Policy) => {
      const initialValues: PolicyFormData = {
        effect: policy.effect,
        action: policy.action,
        resource: policy.resource,
        principal: policy.principal,
        resourceId: policy.resourceId || '',
        roleId: policy.role?.id || undefined,
        userId: policy.user?.id || undefined,
      };

      irminModal.show(
        dict.policy.editPolicy,
        <PolicyForm
          isEditMode={true}
          initialValues={initialValues}
          onSubmit={handleUpdatePolicy(policy)}
          isLoading={
            rolesQuery.isPending ||
            usersQuery.isPending ||
            policyResourceOptionsQuery.isPending
          }
          isSubmitting={updatePolicyMutation.isPending}
          onCancel={() => {
            irminModal.close();
          }}
          roles={rolesQuery.data?.data ?? []}
          users={usersQuery.data?.data ?? []}
          policyResourceOptions={
            policyResourceOptionsQuery.data?.data ?? {
              queries: [],
              scripts: [],
              workflows: [],
              connections: [],
              repositories: [],
              users: [],
              tags: [],
            }
          }
        />
      );
    },
    [
      dict.policy.editPolicy,
      handleUpdatePolicy,
      irminModal,
      rolesQuery,
      usersQuery,
      updatePolicyMutation.isPending,
      policyResourceOptionsQuery,
    ]
  );

  return {
    showCreateForm,
    showEditForm,
    isCreating: createPolicyMutation.isPending || isBatchCreating,
    isUpdating: updatePolicyMutation.isPending,
    isLoading: rolesQuery.isPending || usersQuery.isPending,
  };
}
