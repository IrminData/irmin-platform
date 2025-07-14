import { useCallback } from 'react';

import { useParams } from 'next/navigation';

import type { PolicyAction, PolicyResource } from '@/types/core/Policy';
import { PolicyEffect } from '@/types/core/Policy';

import { usePolicySummary } from './usePolicySummary';

export const useResourceAllowed = () => {
  const params = useParams<{ workspace?: string }>();

  const { policySummaryQuery } = usePolicySummary(params.workspace);

  // Helper function to check if a resource is allowed by policies
  const isResourceAllowed = useCallback(
    (
      resource: PolicyResource,
      action: PolicyAction,
      resourceId?: string
    ): boolean => {
      // Wait for the policy summary to load
      if (policySummaryQuery.isLoading) return false;
      // If there is an error, return false
      if (policySummaryQuery.error) return false;
      // If the policy summary is not loaded, return false
      if (!policySummaryQuery.data?.data?.policies) return false;

      const allPolicies = policySummaryQuery.data.data.policies;

      // Get policies that match the resource and action
      const resourcePolicies = allPolicies.filter(
        (policy) => policy.resource === resource && policy.action === action
      );

      // Check for specific resource policies first
      const specificAllowPolicies = resourcePolicies.filter(
        (policy) =>
          policy.resourceId === resourceId &&
          policy.effect === PolicyEffect.Allow
      );

      // If there's a specific allow policy, it takes priority
      if (specificAllowPolicies.length > 0) return true;

      // Check for specific deny policies
      const specificDenyPolicies = resourcePolicies.filter(
        (policy) =>
          policy.resourceId === resourceId &&
          policy.effect === PolicyEffect.Deny
      );

      // If there's a specific deny policy, return false
      if (specificDenyPolicies.length > 0) return false;

      // If no specific policies, fall back to generic policies
      const genericPolicies = resourcePolicies.filter(
        (policy) => !policy.resourceId
      );

      const genericDenyPolicies = genericPolicies.filter(
        (policy) => policy.effect === PolicyEffect.Deny
      );
      const genericAllowPolicies = genericPolicies.filter(
        (policy) => policy.effect === PolicyEffect.Allow
      );

      // If there are generic deny policies, return false
      if (genericDenyPolicies.length > 0) return false;

      // Return true if there are generic allow policies
      return genericAllowPolicies.length > 0;
    },
    [policySummaryQuery]
  );

  return { isResourceAllowed, loading: policySummaryQuery.isLoading };
};
