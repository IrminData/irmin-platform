import type { Policy, PolicyAction } from '@/types/core/Policy';

export type PermissionLevel = 'read' | 'readWrite' | 'full' | 'custom';

const PERMISSION_LEVEL_ACTIONS: Record<
  Exclude<PermissionLevel, 'custom'>,
  PolicyAction[]
> = {
  read: ['read'],
  readWrite: ['read', 'update'],
  full: ['create', 'read', 'update', 'delete'],
};

/** Derive the permission level from a set of policies for a single principal on a single resource */
export function derivePermissionLevel(policies: Policy[]): PermissionLevel {
  const allowActions = new Set(
    policies.filter((p) => p.effect === 'allow').map((p) => p.action)
  );
  const hasDeny = policies.some((p) => p.effect === 'deny');

  if (hasDeny) return 'custom';

  if (
    allowActions.has('create') &&
    allowActions.has('read') &&
    allowActions.has('update') &&
    allowActions.has('delete')
  ) {
    return 'full';
  }

  if (
    allowActions.has('read') &&
    allowActions.has('update') &&
    !allowActions.has('create') &&
    !allowActions.has('delete')
  ) {
    return 'readWrite';
  }

  if (allowActions.has('read') && allowActions.size === 1) {
    return 'read';
  }

  return 'custom';
}

/** Get the actions that should be present for a given permission level */
export function actionsForLevel(
  level: Exclude<PermissionLevel, 'custom'>
): PolicyAction[] {
  return PERMISSION_LEVEL_ACTIONS[level];
}
