import { useCallback } from 'react';

import PolicyForm from '@/components/ui/policy-editor/PolicyForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { usePolicies } from '@/hooks/usePolicies';
import { usePolicyResourceOptions } from '@/hooks/usePolicyResourceOptions';
import { useRoles } from '@/hooks/useRoles';
import { useUsers } from '@/hooks/useUsers';

import {
  type Policy,
  PolicyAction,
  PolicyEffect,
  PolicyPrincipal,
  PolicyResource,
} from '@/types/core/Policy';

import {
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
  const { irminModal } = usePopup();
  const { createPolicyMutation, updatePolicyMutation } = usePolicies({});
  const { rolesQuery } = useRoles();
  const { usersQuery } = useUsers();
  const { policyResourceOptionsQuery } = usePolicyResourceOptions();

  const handleCreatePolicy = useCallback(
    (formData: PolicyFormData) => {
      const createData = {
        effect: formData.effect,
        action: formData.action,
        resource: formData.resource,
        principal: formData.principal,
        resourceId: formData.resourceId || '',
        roleId:
          formData.principal === PolicyPrincipal.Role
            ? formData.roleId
            : undefined,
        userId:
          formData.principal === PolicyPrincipal.WorkspaceUser
            ? formData.userId
            : undefined,
      };

      createPolicyMutation.mutate(createData, {
        onSuccess: () => {
          irminModal.close();
        },
      });
    },
    [createPolicyMutation, irminModal]
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
        roleId:
          formData.principal === PolicyPrincipal.Role
            ? formData.roleId
            : undefined,
        userId:
          formData.principal === PolicyPrincipal.WorkspaceUser
            ? formData.userId
            : undefined,
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
      effect: PolicyEffect.Allow,
      action: PolicyAction.Read,
      resource: defaultResourceType || PolicyResource.Workspace,
      resourceId: defaultResourceId,
      principal: defaultPrincipalType || PolicyPrincipal.Role,
      roleId: defaultRoleId,
      userId: defaultUserId,
    };

    irminModal.show(
      dict.policy.createPolicy,
      <PolicyForm
        isEditMode={false}
        initialValues={initialValues}
        onSubmit={handleCreatePolicy}
        isLoading={
          rolesQuery.isPending ||
          usersQuery.isPending ||
          policyResourceOptionsQuery.isPending
        }
        isSubmitting={createPolicyMutation.isPending}
        onCancel={() => {
          irminModal.close();
        }}
        roles={rolesQuery.data?.data ?? []}
        users={usersQuery.data?.data ?? []}
        policyResourceOptions={
          policyResourceOptionsQuery.data?.data ?? {
            queries: [],
            workflows: [],
            connections: [],
            repositories: [],
            users: [],
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
    createPolicyMutation.isPending,
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
              workflows: [],
              connections: [],
              repositories: [],
              users: [],
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
    isCreating: createPolicyMutation.isPending,
    isUpdating: updatePolicyMutation.isPending,
    isLoading: rolesQuery.isPending || usersQuery.isPending,
  };
}
