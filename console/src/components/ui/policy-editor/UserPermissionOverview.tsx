'use client';

import { useMemo, useState } from 'react';

import { TbChevronDown, TbChevronRight } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { usePolicies, useRoles, useUsers } from '@/hooks/api';

import { formatActionName, formatResourceName } from './utils';

/** List of workspace users with role badges and user-specific policy counts */
export default function UserPermissionOverview() {
  const { dict } = useLocale();
  const { usersQuery } = useUsers();
  const { rolesQuery } = useRoles();
  const { policiesQuery } = usePolicies({});

  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const users = useMemo(
    () => usersQuery.data?.data ?? [],
    [usersQuery.data?.data]
  );
  const roles = useMemo(
    () => rolesQuery.data?.data ?? [],
    [rolesQuery.data?.data]
  );
  const allPolicies = useMemo(
    () => policiesQuery.data?.data ?? [],
    [policiesQuery.data?.data]
  );

  const userSummaries = useMemo(() => {
    return users.map((user) => {
      // Policies targeting this specific user
      const userPolicies = allPolicies.filter(
        (p) => p.principal === 'workspace_user' && p.user?.id === user.id
      );

      // Policies from user's role(s)
      const userRoleIds = user.roles?.map((r) => r.id) ?? [];
      const rolePolicies = allPolicies.filter(
        (p) =>
          p.principal === 'role' && p.role && userRoleIds.includes(p.role.id)
      );

      // Everyone policies
      const everyonePolicies = allPolicies.filter(
        (p) => p.principal === 'everyone'
      );

      return {
        user,
        userRoles: roles.filter((r) => userRoleIds.includes(r.id)),
        userPolicies,
        rolePolicies,
        everyonePolicies,
        directPolicyCount: userPolicies.length,
      };
    });
  }, [users, roles, allPolicies]);

  const toggleExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  if (usersQuery.isLoading || rolesQuery.isLoading || policiesQuery.isLoading) {
    return <LoadingSkeleton className='h-40 w-full' />;
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-1'>
      {userSummaries.map((summary) => {
        const isExpanded = expandedUsers.has(summary.user.id);
        const effectivePolicies = [
          ...summary.userPolicies.map((p) => ({
            ...p,
            source: dict.policy.permissionOverview.directPermission,
          })),
          ...summary.rolePolicies.map((p) => ({
            ...p,
            source: `${dict.policy.permissionOverview.inheritedFromRole}: ${p.role?.role ?? ''}`,
          })),
          ...summary.everyonePolicies.map((p) => ({
            ...p,
            source: dict.policy.principalEveryone,
          })),
        ];

        return (
          <div key={summary.user.id} className='rounded-md border'>
            <Button
              variant='ghost'
              className='flex w-full items-center justify-between px-3 py-2'
              onClick={() => toggleExpanded(summary.user.id)}
            >
              <div className='flex items-center gap-2'>
                {isExpanded ? (
                  <TbChevronDown className='size-4' />
                ) : (
                  <TbChevronRight className='size-4' />
                )}
                <span className='text-sm font-medium'>
                  {summary.user.email}
                </span>
                {summary.userRoles.map((role) => (
                  <Badge key={role.id} variant='secondary' className='text-xs'>
                    {role.role}
                  </Badge>
                ))}
              </div>
              <div className='flex items-center gap-2'>
                {summary.directPolicyCount > 0 && (
                  <span className='text-xs text-muted-foreground'>
                    {summary.directPolicyCount}{' '}
                    {dict.policy.permissionOverview.additionalPolicies}
                  </span>
                )}
              </div>
            </Button>

            {isExpanded && (
              <div className='border-t px-3 py-2'>
                {effectivePolicies.length === 0 ? (
                  <p className='text-xs text-muted-foreground'>
                    {dict.policy.permissionOverview.noAccess}
                  </p>
                ) : (
                  <div className='flex flex-col gap-1'>
                    {effectivePolicies.map((policy, idx) => (
                      <div
                        key={`${policy.id}-${String(idx)}`}
                        className='flex items-center justify-between text-xs'
                      >
                        <div className='flex items-center gap-2'>
                          <Badge
                            variant={
                              policy.effect === 'allow'
                                ? 'default'
                                : 'destructive'
                            }
                            className='px-1.5 py-0 text-[10px]'
                          >
                            {policy.effect === 'allow'
                              ? dict.policy.effectAllow
                              : dict.policy.effectDeny}
                          </Badge>
                          <span>
                            {formatActionName(dict, policy.action)}{' '}
                            {formatResourceName(policy.resource)}
                          </span>
                        </div>
                        <span
                          className={`
                            text-[10px]
                            ${
                              policy.source ===
                              dict.policy.permissionOverview.directPermission
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground'
                            }
                          `}
                        >
                          {policy.source}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
