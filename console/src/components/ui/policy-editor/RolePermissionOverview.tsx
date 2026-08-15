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

const RESOURCE_GROUPS = [
  {
    labelKey: 'repository',
    resources: [
      'repository',
      'repository_branch',
      'repository_tag',
      'repository_commit',
      'repository_object',
    ],
  },
  { labelKey: 'workflow', resources: ['workflow', 'workflow_run'] },
  { labelKey: 'connection', resources: ['connection'] },
  { labelKey: 'query', resources: ['query'] },
  { labelKey: 'script', resources: ['script'] },
  { labelKey: 'aiApplication', resources: ['ai_application'] },
  { labelKey: 'workspace', resources: ['workspace', 'workspace_tag'] },
  { labelKey: 'user', resources: ['user', 'invite'] },
  { labelKey: 'policy', resources: ['policy'] },
  { labelKey: 'auditLog', resources: ['audit_log'] },
  { labelKey: 'billing', resources: ['billing'] },
  { labelKey: 'docs', resources: ['documentation'] },
] as const satisfies readonly {
  labelKey: string;
  resources: readonly PolicyResource[];
}[];

type AccessLevel = 'full' | 'partial' | 'none' | 'denied';

/** Determine access level for a role on a resource group */
function getAccessLevel(
  rolePolicies: {
    effect: string;
    action: PolicyAction;
    resource: PolicyResource;
  }[],
  resources: readonly PolicyResource[]
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
      icon: <TbCheck aria-hidden='true' className='size-4 text-success' />,
      label: dict.policy.permissionOverview.fullAccess,
    },
    partial: {
      icon: (
        <div aria-hidden='true' className='size-2 rounded-full bg-warning' />
      ),
      label: dict.policy.permissionOverview.partialAccess,
    },
    none: {
      icon: (
        <TbMinus aria-hidden='true' className='size-4 text-muted-foreground' />
      ),
      label: dict.policy.permissionOverview.noAccess,
    },
    denied: {
      icon: <TbX aria-hidden='true' className='size-4 text-destructive' />,
      label: dict.policy.permissionOverview.denied,
    },
  };

  const { icon, label } = config[level];

  return (
    <Tooltip>
      <TooltipTrigger
        type='button'
        aria-label={label}
        className={`
          inline-flex size-6 cursor-help items-center justify-center
          rounded-[2px]
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-accent
        `}
      >
        {icon}
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
                <TableHead key={group.labelKey} className='text-center text-xs'>
                  {
                    dict.policy.permissionOverview.resourceGroups[
                      group.labelKey
                    ]
                  }
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
                      {dict.policy.permissionOverview.ownerSuffix}
                    </span>
                  )}
                </TableCell>
                {row.levels.map((level, idx) => (
                  <TableCell
                    key={RESOURCE_GROUPS[idx].labelKey}
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
