import { useMutation, useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { generateTempId } from '@/utils/generateTempId';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import {
  Policy,
  PolicyAction,
  PolicyEffect,
  PolicyPrincipal,
  PolicyResource,
} from '@/types/core/Policy';

import { policyQueryKey } from './usePolicy';

export const policiesQueryKey = (
  workspaceSlug: string,
  effect?: PolicyEffect,
  action?: PolicyAction,
  resource?: PolicyResource,
  resourceId?: string,
  principal?: PolicyPrincipal,
  roleId?: string,
  userId?: string
) =>
  [
    'policies',
    workspaceSlug,
    effect,
    action,
    resource,
    resourceId,
    principal,
    roleId,
    userId,
  ] as const;

export type PolicyCreateInput = {
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
    onMutate: async (data: PolicyCreateInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: policiesQueryKey(workspaceSlug),
      });

      // Snapshot the previous value
      const previousPolicies = queryClient.getQueryData<
        IrminAPIResponse<Policy[]>
      >(
        policiesQueryKey(
          workspaceSlug,
          effect,
          action,
          resource,
          resourceId,
          principal,
          roleId,
          userId
        )
      );

      // Create unique temp ID for this specific mutation
      const tempId = generateTempId('policies');

      // Optimistically update the cache
      queryClient.setQueryData<IrminAPIResponse<Policy[]>>(
        policiesQueryKey(
          workspaceSlug,
          effect,
          action,
          resource,
          resourceId,
          principal,
          roleId,
          userId
        ),
        (old: IrminAPIResponse<Policy[]> | undefined) => {
          if (!old?.data) return old;

          // Create optimistic policy object
          const optimisticPolicy: Policy = {
            id: tempId, // Unique temporary ID
            effect: data.effect,
            action: data.action,
            resource: data.resource,
            principal: data.principal,
            resourceId: data.resourceId,
            // Add role or user if provided
            ...(data.roleId && {
              role: {
                id: data.roleId,
                role: 'Loading...',
                description: '',
                isOwner: false,
                isDefault: false,
              },
            }),
            ...(data.userId && {
              user: {
                id: data.userId,
                first_name: 'Loading',
                last_name: 'User',
                email: '',
                phone: '',
                company: '',
                profile_picture: '',
              },
            }),
          };

          return {
            ...old,
            data: [...old.data, optimisticPolicy],
          };
        }
      );

      // Return context for rollback
      return { previousPolicies, tempId };
    },
    onError: (error, data: PolicyCreateInput, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | { previousPolicies?: IrminAPIResponse<Policy[]>; tempId?: string }
        | undefined;
      if (ctx?.previousPolicies) {
        queryClient.setQueryData(
          policiesQueryKey(
            workspaceSlug,
            effect,
            action,
            resource,
            resourceId,
            principal,
            roleId,
            userId
          ),
          ctx.previousPolicies
        );
      }
      console.error(error);
      irminAlert('error', error.message ?? 'Error creating policy');
    },
    onSuccess: (
      res: IrminAPIResponse<Policy>,
      data: PolicyCreateInput,
      context: unknown
    ) => {
      // Update the cache with the real data from the server
      const ctx = context as
        | { previousPolicies?: IrminAPIResponse<Policy[]>; tempId?: string }
        | undefined;

      queryClient.setQueryData<IrminAPIResponse<Policy[]>>(
        policiesQueryKey(
          workspaceSlug,
          effect,
          action,
          resource,
          resourceId,
          principal,
          roleId,
          userId
        ),
        (old: IrminAPIResponse<Policy[]> | undefined) => {
          if (!old?.data || !res.data || !ctx?.tempId) return old;

          // Replace the specific optimistic policy with the real one using exact temp ID
          const updatedPolicies = old.data.map((policy: Policy) =>
            policy.id === ctx.tempId ? res.data! : policy
          );

          return {
            ...old,
            data: updatedPolicies,
          };
        }
      );

      irminAlert('success', res.message ?? 'Policy created successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: policiesQueryKey(workspaceSlug),
      });
    },
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
    onMutate: async (policyId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: policyQueryKey(workspaceSlug, policyId),
      });
      await queryClient.cancelQueries({
        queryKey: policiesQueryKey(workspaceSlug),
      });

      // Snapshot the previous values
      const previousPolicy = queryClient.getQueryData<IrminAPIResponse<Policy>>(
        policyQueryKey(workspaceSlug, policyId)
      );
      const previousPolicies = queryClient.getQueryData<
        IrminAPIResponse<Policy[]>
      >(
        policiesQueryKey(
          workspaceSlug,
          effect,
          action,
          resource,
          resourceId,
          principal,
          roleId,
          userId
        )
      );

      // Optimistically remove from policies list cache
      queryClient.setQueryData<IrminAPIResponse<Policy[]>>(
        policiesQueryKey(
          workspaceSlug,
          effect,
          action,
          resource,
          resourceId,
          principal,
          roleId,
          userId
        ),
        (old: IrminAPIResponse<Policy[]> | undefined) => {
          if (!old?.data) return old;

          const filteredPolicies = old.data.filter(
            (policy: Policy) => policy.id !== policyId
          );

          return {
            ...old,
            data: filteredPolicies,
          };
        }
      );

      // Clear single policy cache
      queryClient.removeQueries({
        queryKey: policyQueryKey(workspaceSlug, policyId),
      });

      // Return context for rollback
      return { previousPolicy, previousPolicies };
    },
    onError: (error, policyId: string, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | {
            previousPolicy?: IrminAPIResponse<Policy>;
            previousPolicies?: IrminAPIResponse<Policy[]>;
          }
        | undefined;
      if (ctx?.previousPolicy) {
        queryClient.setQueryData(
          policyQueryKey(workspaceSlug, policyId),
          ctx.previousPolicy
        );
      }
      if (ctx?.previousPolicies) {
        queryClient.setQueryData(
          policiesQueryKey(
            workspaceSlug,
            effect,
            action,
            resource,
            resourceId,
            principal,
            roleId,
            userId
          ),
          ctx.previousPolicies
        );
      }
      irminAlert('error', error.message ?? 'Error deleting policy');
    },
    onSuccess: (res: IrminAPIResponse, _policyId: string) => {
      // The optimistic update is already done, just show success message
      irminAlert('success', res.message ?? 'Policy deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: policiesQueryKey(workspaceSlug),
      });
    },
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
      queryClient.invalidateQueries({
        queryKey: policyQueryKey(workspaceSlug, data.policyId),
      });
      queryClient.invalidateQueries({
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
