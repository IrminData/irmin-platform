import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { policiesQueryKey, policyQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type {
  Policy,
  PolicyAction,
  PolicyEffect,
  PolicyPrincipal,
  PolicyResource,
} from '@/types/core/Policy';

import {
  createMutationHandlers,
  deleteMutationHandlers,
} from './mutations/utils';

type PolicyCreateInput = {
  effect: PolicyEffect;
  action: PolicyAction;
  resource: PolicyResource;
  principal: PolicyPrincipal;
  resourceId?: string;
  roleId?: string;
  userId?: string;
};

type PolicyUpdateInput = {
  policyId: string;
  effect?: PolicyEffect;
  action?: PolicyAction;
  resource?: PolicyResource;
  principal?: PolicyPrincipal;
  resourceId?: string;
  roleId?: string;
  userId?: string;
};

export function usePolicies({
  effect,
  action,
  resource,
  resourceId,
  principal,
  roleId,
  userId,
}: {
  effect?: PolicyEffect;
  action?: PolicyAction;
  resource?: PolicyResource;
  resourceId?: string;
  principal?: PolicyPrincipal;
  roleId?: string;
  userId?: string;
}) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const policiesQuery = useQuery<IrminAPIResponse<Policy[]>, Error>({
    queryKey: policiesQueryKey(
      workspaceSlug,
      effect,
      action,
      resource,
      resourceId,
      principal,
      roleId,
      userId
    ),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.policyService.listPolicies({
        workspace: workspaceSlug,
        effect,
        action,
        resource,
        principal,
        resourceId,
        roleId,
        userId,
      });
    },
  });

  const createPolicyMutation = useMutation<
    IrminAPIResponse<Policy>,
    Error,
    PolicyCreateInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.policyService.createPolicy({
        workspace: workspaceSlug,
        effect: data.effect,
        action: data.action,
        resource: data.resource,
        principal: data.principal,
        resourceId: data.resourceId,
        roleId: data.roleId,
        userId: data.userId,
      });
    },
    ...createMutationHandlers<Policy, PolicyCreateInput>(
      queryClient,
      'policies',
      {
        cacheConfig: {
          primaryQueryKey: policiesQueryKey(
            workspaceSlug,
            effect,
            action,
            resource,
            resourceId,
            principal,
            roleId,
            userId
          ),
          relatedQueryKeys: [['policies', workspaceSlug]],
          getItemId: (policy) => policy.id,
          createOptimisticItem: (input: PolicyCreateInput, tempId: string) => ({
            id: tempId,
            effect: input.effect,
            action: input.action,
            resource: input.resource,
            principal: input.principal,
            resourceId: input.resourceId,
            ...(input.roleId && {
              role: {
                id: input.roleId,
                role: 'Loading...',
                description: '',
                isOwner: false,
                isDefault: false,
              },
            }),
            ...(input.userId && {
              user: {
                id: input.userId,
                first_name: 'Loading',
                last_name: 'User',
                email: '',
                phone: '',
                company: '',
                profile_picture: '',
              },
            }),
          }),
        },
        onSuccess: (res) => {
          irminAlert('success', res.message ?? 'Policy created successfully');
          // Invalidate all policy queries to ensure filtered views are consistent
          queryClient.invalidateQueries({
            queryKey: ['policies', workspaceSlug],
          });
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Error creating policy');
        },
      }
    ),
  });

  const deletePolicyMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (policyId: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.policyService.deletePolicy({
        workspace: workspaceSlug,
        policyId: policyId,
      });
    },
    ...deleteMutationHandlers<Policy>(queryClient, {
      cacheConfig: {
        primaryQueryKey: policiesQueryKey(
          workspaceSlug,
          effect,
          action,
          resource,
          resourceId,
          principal,
          roleId,
          userId
        ),
        relatedQueryKeys: [['policies', workspaceSlug]],
        getItemId: (policy) => policy.id,
      },

      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Policy deleted successfully');
        // Invalidate all policy queries to ensure filtered views are consistent
        queryClient.invalidateQueries({
          queryKey: ['policies', workspaceSlug],
        });
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Error deleting policy');
      },
    }),
  });

  const updatePolicyMutation = useMutation<
    IrminAPIResponse<Policy>,
    Error,
    PolicyUpdateInput
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.policyService.updatePolicy({
        workspace: workspaceSlug,
        policyId: data.policyId,
        effect: data.effect ?? undefined,
        action: data.action ?? undefined,
        resource: data.resource ?? undefined,
        principal: data.principal ?? undefined,
        resourceId: data.resourceId ?? undefined,
        roleId: data.roleId ?? undefined,
        userId: data.userId ?? undefined,
      });
    },
    onSuccess: (res, data) => {
      void queryClient.invalidateQueries({
        queryKey: policyQueryKey(workspaceSlug, data.policyId),
      });
      void queryClient.invalidateQueries({
        queryKey: policiesQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Policy updated successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error updating policy');
    },
  });

  return {
    // Queries
    policiesQuery,

    // Mutations
    createPolicyMutation,
    deletePolicyMutation,
    updatePolicyMutation,
  };
}
