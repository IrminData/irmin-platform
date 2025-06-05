import { Dictionary } from '@/lib/dict';

import {
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
    case PolicyAction.Create:
      return dict.policy.actionCreate;
    case PolicyAction.Read:
      return dict.policy.actionRead;
    case PolicyAction.Update:
      return dict.policy.actionUpdate;
    case PolicyAction.Delete:
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
    case PolicyPrincipal.WorkspaceUser:
      return dict.policy.principalWorkspaceUser;
    case PolicyPrincipal.Role:
      return dict.policy.principalRole;
    case PolicyPrincipal.Everyone:
      return dict.policy.principalEveryone;
    default:
      principalStr = String(principal);
      return principalStr
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
};
