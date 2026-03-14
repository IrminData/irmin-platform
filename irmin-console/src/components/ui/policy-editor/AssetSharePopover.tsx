'use client';

import { useMemo, useState } from 'react';

import { TbShare, TbTrash } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { usePolicies, useRoles, useUsers } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Policy, PolicyResource } from '@/types/core/Policy';

import {
  actionsForLevel,
  derivePermissionLevel,
  type PermissionLevel,
} from './permissionLevels';

interface AssetSharePopoverProps {
  resourceType: PolicyResource;
  resourceId: string;
  resourceLabel: string;
}

interface PrincipalGroup {
  key: string;
  label: string;
  type: 'role' | 'workspace_user';
  policies: Policy[];
  level: PermissionLevel;
  isOwner: boolean;
}

/** Popover to share an asset (repository, workflow, etc.) with users or roles */
export default function AssetSharePopover({
  resourceType,
  resourceId,
  resourceLabel,
}: AssetSharePopoverProps) {
  const { dict } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const { isResourceAllowed, loading: permissionsLoading } =
    useResourceAllowed();
  const { policiesQuery, createPolicyMutation, deletePolicyMutation } =
    usePolicies({
      resource: resourceType,
      resourceId,
      silent: true,
    });
  const { rolesQuery } = useRoles();
  const { usersQuery } = useUsers();

  const [addPrincipalType, setAddPrincipalType] = useState<
    'role' | 'workspace_user'
  >('role');
  const [addPrincipalId, setAddPrincipalId] = useState<string>('');
  const [addLevel, setAddLevel] = useState<'read' | 'readWrite' | 'full'>(
    'read'
  );
  const [isGranting, setIsGranting] = useState(false);
  const [changingLevelKey, setChangingLevelKey] = useState<string | null>(null);

  const canCreatePolicy = useMemo(
    () => isResourceAllowed('policy', 'create'),
    [isResourceAllowed]
  );
  const canDeletePolicy = useMemo(
    () => isResourceAllowed('policy', 'delete'),
    [isResourceAllowed]
  );

  if (permissionsLoading || !canCreatePolicy) return null;

  const policies = policiesQuery.data?.data ?? [];
  const roles = rolesQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];

  // Group policies by principal
  const principalGroups: PrincipalGroup[] = (() => {
    const groups = new Map<string, Policy[]>();
    for (const policy of policies) {
      let key: string;
      if (policy.principal === 'role' && policy.role) {
        key = `role:${policy.role.id}`;
      } else if (policy.principal === 'workspace_user' && policy.user) {
        key = `workspace_user:${policy.user.id}`;
      } else {
        continue;
      }
      const existing = groups.get(key) ?? [];
      existing.push(policy);
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).map(([key, groupPolicies]) => {
      const separatorIndex = key.indexOf(':');
      const type = key.slice(0, separatorIndex) as 'role' | 'workspace_user';
      const id = key.slice(separatorIndex + 1);
      let label = id;
      let isOwner = false;
      if (type === 'role') {
        const firstPolicy = groupPolicies[0];
        label =
          firstPolicy?.role?.role ?? roles.find((r) => r.id === id)?.role ?? id;
        isOwner = firstPolicy?.role?.isOwner ?? false;
      } else {
        label = users.find((u) => u.id === id)?.email ?? id;
      }
      return {
        key,
        label,
        type,
        policies: groupPolicies,
        level: derivePermissionLevel(groupPolicies),
        isOwner,
      };
    });
  })();

  const levelLabel = (level: PermissionLevel) => {
    switch (level) {
      case 'read':
        return dict.policy.share.readOnly;
      case 'readWrite':
        return dict.policy.share.readWrite;
      case 'full':
        return dict.policy.share.fullAccess;
      case 'custom':
        return dict.policy.share.custom;
    }
  };

  const handleGrantAccess = async () => {
    if (!addPrincipalId) return;
    setIsGranting(true);

    const actions = actionsForLevel(addLevel);
    const results = await Promise.allSettled(
      actions.map((action) =>
        createPolicyMutation.mutateAsync({
          effect: 'allow',
          action,
          resource: resourceType,
          resourceId,
          principal: addPrincipalType,
          roleId: addPrincipalType === 'role' ? addPrincipalId : undefined,
          userId:
            addPrincipalType === 'workspace_user' ? addPrincipalId : undefined,
        })
      )
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

    if (failed > 0 && succeeded === 0 && alreadyExisted === 0) {
      irminAlert('error', dict.policy.share.grantAccessFailed);
    } else if (failed > 0) {
      irminAlert('error', dict.policy.share.grantAccessPartial);
    } else {
      irminAlert('success', dict.policy.share.accessGranted);
    }
    setIsGranting(false);
    setAddPrincipalId('');
  };

  const handleRemoveAccess = async (group: PrincipalGroup) => {
    const confirmed = await irminConfirm(
      'warning',
      dict.policy.share.removeAccessConfirm
    );
    if (!confirmed) return;

    const results = await Promise.allSettled(
      group.policies.map((policy) =>
        deletePolicyMutation.mutateAsync(policy.id)
      )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      irminAlert('error', dict.policy.share.removeAccessFailed);
    } else {
      irminAlert('success', dict.policy.share.accessRemoved);
    }
  };

  const handleChangeLevel = async (
    group: PrincipalGroup,
    newLevel: 'read' | 'readWrite' | 'full'
  ) => {
    if (changingLevelKey) return;
    setChangingLevelKey(group.key);
    const principalId = group.key.slice(group.key.indexOf(':') + 1);

    // Delete existing policies for this principal
    const deleteResults = await Promise.allSettled(
      group.policies.map((policy) =>
        deletePolicyMutation.mutateAsync(policy.id)
      )
    );

    const deleteSucceeded = deleteResults.filter(
      (r) => r.status === 'fulfilled'
    ).length;
    const deleteFailed = deleteResults.filter(
      (r) => r.status === 'rejected'
    ).length;
    if (deleteFailed > 0) {
      irminAlert(
        'error',
        deleteSucceeded > 0
          ? dict.policy.share.changeLevelDeletePartial
          : dict.policy.share.changeLevelDeleteFailed
      );
      setChangingLevelKey(null);
      return;
    }

    // Create new policies for the new level
    const actions = actionsForLevel(newLevel);
    const createResults = await Promise.allSettled(
      actions.map((action) =>
        createPolicyMutation.mutateAsync({
          effect: 'allow',
          action,
          resource: resourceType,
          resourceId,
          principal: group.type,
          roleId: group.type === 'role' ? principalId : undefined,
          userId: group.type === 'workspace_user' ? principalId : undefined,
        })
      )
    );

    const createFailed = createResults.filter(
      (r) => r.status === 'rejected'
    ).length;
    if (createFailed > 0) {
      // Rollback: delete any successfully-created new policies first
      const newPolicyIds = createResults
        .filter(
          (r): r is PromiseFulfilledResult<IrminAPIResponse<Policy>> =>
            r.status === 'fulfilled'
        )
        .map((r) => r.value.data?.id)
        .filter((id): id is string => !!id);
      await Promise.allSettled(
        newPolicyIds.map((id) => deletePolicyMutation.mutateAsync(id))
      );

      // Then restore the original policies
      const oldPolicies = group.policies.filter((p) => p.effect === 'allow');
      await Promise.allSettled(
        oldPolicies.map((p) =>
          createPolicyMutation.mutateAsync({
            effect: 'allow',
            action: p.action,
            resource: resourceType,
            resourceId,
            principal: group.type,
            roleId: group.type === 'role' ? principalId : undefined,
            userId: group.type === 'workspace_user' ? principalId : undefined,
          })
        )
      );
      irminAlert('error', dict.policy.share.changeLevelCreateFailed);
    } else {
      irminAlert('success', dict.policy.share.changeLevelSuccess);
    }
    setChangingLevelKey(null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm'>
          <TbShare className='mr-1 size-4' />
          {dict.policy.share.title}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-96' align='end'>
        <div className='flex flex-col gap-3'>
          <h4 className='text-sm font-semibold'>
            {dict.policy.share.shareThis} &ldquo;{resourceLabel}&rdquo;
          </h4>

          <Separator />

          {/* Current access list */}
          <div className='flex flex-col gap-2'>
            <span className='text-xs font-medium text-muted-foreground'>
              {dict.policy.share.currentAccess}
            </span>
            {principalGroups.length === 0 ? (
              <p className='text-xs text-muted-foreground'>
                {dict.policy.share.noOneHasAccess}
              </p>
            ) : (
              principalGroups.map((group) => (
                <div
                  key={group.key}
                  className='flex items-center justify-between gap-2'
                >
                  <div className='flex items-center gap-2 overflow-hidden'>
                    <Badge variant='outline' className='shrink-0 text-xs'>
                      {group.type === 'role'
                        ? dict.policy.principalRole
                        : dict.policy.principalWorkspaceUser}
                    </Badge>
                    <span className='truncate text-sm'>{group.label}</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    {group.isOwner ? (
                      <Badge variant='secondary' className='text-xs'>
                        {dict.policy.share.fullAccess}
                      </Badge>
                    ) : group.level === 'custom' || !canDeletePolicy ? (
                      <Badge variant='secondary' className='text-xs'>
                        {levelLabel(group.level)}
                      </Badge>
                    ) : (
                      <Select
                        value={group.level}
                        disabled={changingLevelKey !== null}
                        onValueChange={(value) =>
                          handleChangeLevel(
                            group,
                            value as 'read' | 'readWrite' | 'full'
                          )
                        }
                      >
                        <SelectTrigger className='h-7 w-[120px] text-xs'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='read'>
                            {dict.policy.share.readOnly}
                          </SelectItem>
                          <SelectItem value='readWrite'>
                            {dict.policy.share.readWrite}
                          </SelectItem>
                          <SelectItem value='full'>
                            {dict.policy.share.fullAccess}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {canDeletePolicy && !group.isOwner && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-7'
                        disabled={changingLevelKey !== null}
                        onClick={() => handleRemoveAccess(group)}
                      >
                        <TbTrash className='size-3.5' />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* Add access section */}
          <div className='flex flex-col gap-2'>
            <span className='text-xs font-medium text-muted-foreground'>
              {dict.policy.share.addAccess}
            </span>
            <div className='flex gap-2'>
              <Select
                value={addPrincipalType}
                onValueChange={(value) => {
                  setAddPrincipalType(value as 'role' | 'workspace_user');
                  setAddPrincipalId('');
                }}
              >
                <SelectTrigger className='h-8 w-[90px] text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='role'>
                    {dict.policy.principalRole}
                  </SelectItem>
                  <SelectItem value='workspace_user'>
                    {dict.policy.principalWorkspaceUser}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={addPrincipalId} onValueChange={setAddPrincipalId}>
                <SelectTrigger className='h-8 flex-1 text-xs'>
                  <SelectValue
                    placeholder={
                      addPrincipalType === 'role'
                        ? dict.policy.principalRole
                        : dict.policy.principalWorkspaceUser
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {addPrincipalType === 'role'
                    ? roles
                        .filter((role) => !role.isOwner)
                        .map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.role}
                          </SelectItem>
                        ))
                    : users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2'>
              <Select
                value={addLevel}
                onValueChange={(value) =>
                  setAddLevel(value as 'read' | 'readWrite' | 'full')
                }
              >
                <SelectTrigger className='h-8 flex-1 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='read'>
                    {dict.policy.share.readOnly}
                  </SelectItem>
                  <SelectItem value='readWrite'>
                    {dict.policy.share.readWrite}
                  </SelectItem>
                  <SelectItem value='full'>
                    {dict.policy.share.fullAccess}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                size='sm'
                className='h-8'
                onClick={handleGrantAccess}
                disabled={!addPrincipalId}
                loading={isGranting}
              >
                {dict.policy.share.grantAccess}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
