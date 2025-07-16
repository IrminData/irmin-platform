import type { Dictionary } from '@/lib/dict';

import type {
  PolicyAction,
  PolicyPrincipal,
  PolicyResource,
} from '@/types/core/Policy';

export const formatResourceName = (resource: PolicyResource): string => {
  return resource
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
};

export const formatActionName = (
  dict: Dictionary,
  action: PolicyAction
): string => {
  let actionStr: string;
  switch (action) {
    case 'create':
      return dict.policy.actionCreate;
    case 'read':
      return dict.policy.actionRead;
    case 'update':
      return dict.policy.actionUpdate;
    case 'delete':
      return dict.policy.actionDelete;
    default:
      actionStr = String(action);
      return actionStr.charAt(0).toUpperCase() + actionStr.slice(1);
  }
};

export const formatPrincipalName = (
  dict: Dictionary,
  principal: PolicyPrincipal
): string => {
  let principalStr: string;
  switch (principal) {
    case 'workspace_user':
      return dict.policy.principalWorkspaceUser;
    case 'role':
      return dict.policy.principalRole;
    case 'everyone':
      return dict.policy.principalEveryone;
    default:
      principalStr = String(principal);
      return principalStr
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
};
