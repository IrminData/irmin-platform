'use client';

import { useMemo } from 'react';

import { TbCheck, TbMinus, TbX } from 'react-icons/tb';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useLocale } from '@/context/LocaleContext';

import { useRolePolicySummary } from '@/hooks/api';

import type { PolicyAction, PolicyResource } from '@/types/core/Policy';

import { POLICY_ACTIONS } from './constants';

const RESOURCE_GROUPS: { label: string; resources: PolicyResource[] }[] = [
  {
    label: 'Repository',
    resources: [
      'repository',
      'repository_branch',
      'repository_tag',
      'repository_commit',
      'repository_object',
    ],
  },
  { label: 'Workflow', resources: ['workflow', 'workflow_run'] },
  { label: 'Connection', resources: ['connection'] },
  { label: 'Query', resources: ['query'] },
  { label: 'Script', resources: ['script'] },
  { label: 'AI Application', resources: ['ai_application'] },
  { label: 'Workspace', resources: ['workspace', 'workspace_tag'] },
  { label: 'User', resources: ['user', 'invite'] },
  { label: 'Policy', resources: ['policy'] },
  { label: 'Audit Log', resources: ['audit_log'] },
  { label: 'Billing', resources: ['billing'] },
  { label: 'Docs', resources: ['documentation'] },
];

type AccessLevel = 'full' | 'partial' | 'none' | 'denied';

/** Determine access level for a role on a resource group */
function getAccessLevel(
  rolePolicies: {
    effect: string;
    action: PolicyAction;
    resource: PolicyResource;
  }[],
  resources: PolicyResource[]
): AccessLevel {
  const relevant = rolePolicies.filter((p) => resources.includes(p.resource));

  const hasDeny = relevant.some((p) => p.effect === 'deny');
  if (hasDeny) return 'denied';

  // Check actions per individual resource, not across the whole group
  const perResourceLevels = resources.map((resource) => {
    const resourceAllows = new Set(
      relevant
        .filter((p) => p.resource === resource && p.effect === 'allow')
        .map((p) => p.action)
    );
    return {
      full: POLICY_ACTIONS.every((a) => resourceAllows.has(a)),
      hasAny: resourceAllows.size > 0,
    };
  });

  const allFull = perResourceLevels.every((r) => r.full);
  if (allFull) return 'full';

  const anyAccess = perResourceLevels.some((r) => r.hasAny);
  if (anyAccess) return 'partial';

  return 'none';
}

/** Renders a cell icon for the given access level */
function AccessCell({ level }: { level: AccessLevel }) {
  const { dict } = useLocale();

  const config = {
    full: {
      icon: <TbCheck className='size-4 text-green-500' />,
      label: dict.policy.permissionOverview.fullAccess,
    },
    partial: {
      icon: <div className='size-2 rounded-full bg-yellow-500' />,
      label: dict.policy.permissionOverview.partialAccess,
    },
    none: {
      icon: <TbMinus className='size-4 text-muted-foreground' />,
      label: dict.policy.permissionOverview.noAccess,
    },
    denied: {
      icon: <TbX className='size-4 text-destructive' />,
      label: dict.policy.permissionOverview.denied,
    },
  };

  const { icon, label } = config[level];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className='flex items-center justify-center'>{icon}</div>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Matrix/grid view: rows = roles, columns = resource type groups */
export default function RolePermissionOverview() {
  const { dict } = useLocale();
  const { rolePolicySummaryQuery } = useRolePolicySummary();

  const summaries = useMemo(
    () => rolePolicySummaryQuery.data?.data ?? [],
    [rolePolicySummaryQuery.data?.data]
  );

  const matrix = useMemo(() => {
    return summaries.map((summary) => ({
      role: summary.role,
      isOwner: summary.is_owner,
      levels: RESOURCE_GROUPS.map((group) =>
        summary.is_owner
          ? ('full' as AccessLevel)
          : getAccessLevel(summary.policies, group.resources)
      ),
    }));
  }, [summaries]);

  if (rolePolicySummaryQuery.isLoading) {
    return <LoadingSkeleton className='h-40 w-full' />;
  }

  if (summaries.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='sticky left-0 bg-background'>
                {dict.policy.principalRole}
              </TableHead>
              {RESOURCE_GROUPS.map((group) => (
                <TableHead key={group.label} className='text-center text-xs'>
                  {group.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.map((row) => (
              <TableRow key={row.role.id}>
                <TableCell className='sticky left-0 bg-background font-medium'>
                  {row.role.role}
                  {row.isOwner && (
                    <span className='ml-1 text-xs text-muted-foreground'>
                      (owner)
                    </span>
                  )}
                </TableCell>
                {row.levels.map((level, idx) => (
                  <TableCell
                    key={RESOURCE_GROUPS[idx].label}
                    className='text-center'
                  >
                    <AccessCell level={level} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
