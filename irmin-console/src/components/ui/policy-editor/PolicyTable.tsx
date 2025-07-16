import type React from 'react';
import { useMemo, useState } from 'react';

import {
  TbChevronDown,
  TbChevronUp,
  TbEdit,
  TbInfoCircle,
  TbSelector,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
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

import { usePolicyResourceOptions } from '@/hooks/api';

import type { PolicyResource } from '@/types/core/Policy';

import PolicyDeleteButton from './PolicyDeleteButton';
import PolicyEffectBadge from './PolicyEffectBadge';
import type { PolicyTableProps } from './types';
import {
  formatActionName,
  formatPrincipalName,
  formatResourceName,
} from './utils';

type SortableColumn =
  | 'action'
  | 'effect'
  | 'principal'
  | 'resource'
  | 'resourceId';
type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: SortableColumn | null;
  direction: SortDirection;
}

export default function PolicyTable({
  policies,
  showResourceColumn = true,
  showResourceIdColumn = true,
  allowEdit = true,
  allowDelete = true,
  onEditClick,
}: PolicyTableProps) {
  const { dict } = useLocale();

  const { policyResourceOptionsQuery } = usePolicyResourceOptions();

  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const handleSort = (column: SortableColumn) => {
    setSortState((prevState) => {
      if (prevState.column === column) {
        // Cycle through: asc -> desc -> null
        const newDirection: SortDirection =
          prevState.direction === 'asc'
            ? 'desc'
            : prevState.direction === 'desc'
              ? null
              : 'asc';
        return {
          column: newDirection ? column : null,
          direction: newDirection,
        };
      } else {
        return { column, direction: 'asc' };
      }
    });
  };

  const sortedPolicies = useMemo(() => {
    if (!sortState.column || !sortState.direction) {
      return policies;
    }

    return [...policies].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortState.column) {
        case 'effect':
          aValue = a.effect;
          bValue = b.effect;
          break;
        case 'action':
          aValue = formatActionName(dict, a.action);
          bValue = formatActionName(dict, b.action);
          break;
        case 'principal':
          aValue = formatPrincipalName(dict, a.principal);
          bValue = formatPrincipalName(dict, b.principal);
          break;
        case 'resource':
          aValue = formatResourceName(a.resource);
          bValue = formatResourceName(b.resource);
          break;
        case 'resourceId':
          aValue = a.resourceId || '';
          bValue = b.resourceId || '';
          break;
        default:
          return 0;
      }

      const comparison = aValue.localeCompare(bValue, undefined, {
        numeric: true,
      });
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }, [policies, sortState, dict]);

  const getSortIcon = (column: SortableColumn) => {
    if (sortState.column !== column) {
      return <TbSelector className='size-4 text-muted-foreground' />;
    }

    if (sortState.direction === 'asc') {
      return <TbChevronUp className='size-4' />;
    } else if (sortState.direction === 'desc') {
      return <TbChevronDown className='size-4' />;
    }

    return <TbSelector className='size-4 text-muted-foreground' />;
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: SortableColumn;
    children: React.ReactNode;
  }) => (
    <div
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSort(column);
        }
      }}
      className={`
        flex cursor-pointer items-center gap-2 transition-colors select-none
        hover:text-foreground
      `}
      onClick={() => handleSort(column)}
    >
      {children}
      {getSortIcon(column)}
    </div>
  );

  const formatResourceId = (
    resourceType: PolicyResource,
    resourceId?: string
  ) => {
    if (!resourceId) {
      return dict.policy.allResources;
    }
    if (resourceType === 'query') {
      return (
        policyResourceOptionsQuery.data?.data?.queries.find(
          (option) => option.id === resourceId
        )?.label ?? resourceId
      );
    }
    if (resourceType === 'workflow' || resourceType === 'workflow_run') {
      return (
        policyResourceOptionsQuery.data?.data?.workflows.find(
          (option) => option.id === resourceId
        )?.label ?? resourceId
      );
    }
    if (resourceType === 'connection') {
      return (
        policyResourceOptionsQuery.data?.data?.connections.find(
          (option) => option.id === resourceId
        )?.label ?? resourceId
      );
    }
    if (
      resourceType === 'repository' ||
      resourceType === 'repository_branch' ||
      resourceType === 'repository_tag' ||
      resourceType === 'repository_commit' ||
      resourceType === 'repository_object'
    ) {
      return (
        policyResourceOptionsQuery.data?.data?.repositories.find(
          (option) => option.id === resourceId
        )?.label ?? resourceId
      );
    }
    if (resourceType === 'user') {
      return (
        policyResourceOptionsQuery.data?.data?.users.find(
          (option) => option.id === resourceId
        )?.label ?? resourceId
      );
    }
    if (resourceType === 'workspace_tag') {
      return (
        policyResourceOptionsQuery.data?.data?.tags.find(
          (option) => option.id === resourceId
        )?.label ?? resourceId
      );
    }
    return resourceId;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='max-w-[80]'>
            <SortableHeader column='effect'>
              <div className='flex items-center gap-2'>
                {dict.policy.effect}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                      <TbInfoCircle
                        className='cursor-help text-muted-foreground'
                        size={16}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {dict.policy.tooltips.effect}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </SortableHeader>
          </TableHead>
          <TableHead>
            <SortableHeader column='action'>
              <div className='flex items-center gap-2'>
                {dict.policy.action}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                      <TbInfoCircle
                        className='cursor-help text-muted-foreground'
                        size={16}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {dict.policy.tooltips.action}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </SortableHeader>
          </TableHead>
          <TableHead>
            <SortableHeader column='principal'>
              <div className='flex items-center gap-2'>
                {dict.policy.principal}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                      <TbInfoCircle
                        className='cursor-help text-muted-foreground'
                        size={16}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {dict.policy.tooltips.principal}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </SortableHeader>
          </TableHead>
          {showResourceColumn && (
            <TableHead>
              <SortableHeader column='resource'>
                <div className='flex items-center gap-2'>
                  {dict.policy.resource}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                        <TbInfoCircle
                          className='cursor-help text-muted-foreground'
                          size={16}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {dict.policy.tooltips.resource}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </SortableHeader>
            </TableHead>
          )}
          {showResourceIdColumn && (
            <TableHead>
              <SortableHeader column='resourceId'>
                <div className='flex items-center gap-2'>
                  {dict.policy.resourceId}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                        <TbInfoCircle
                          className='cursor-help text-muted-foreground'
                          size={16}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {dict.policy.tooltips.resourceId}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </SortableHeader>
            </TableHead>
          )}
          {(allowEdit || allowDelete) && (
            <TableHead className='text-right'>{dict.common.actions}</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPolicies.map((policy) => (
          <TableRow key={policy.id}>
            <TableCell className='max-w-[80px]'>
              <div className='flex items-center gap-2'>
                <PolicyEffectBadge effect={policy.effect} />
              </div>
            </TableCell>
            <TableCell>{formatActionName(dict, policy.action)}</TableCell>
            <TableCell>
              {formatPrincipalName(dict, policy.principal)}
              {policy.principal === 'role' && (
                <span className='pl-2 text-sm text-muted-foreground'>
                  ({policy.role?.role})
                </span>
              )}
              {policy.principal === 'workspace_user' && (
                <span className='pl-2 text-sm text-muted-foreground'>
                  ({policy.user?.email})
                </span>
              )}
            </TableCell>
            {showResourceColumn && (
              <TableCell>{formatResourceName(policy.resource)}</TableCell>
            )}
            {showResourceIdColumn && (
              <TableCell>
                <code className='rounded bg-muted px-1 py-0.5 text-xs'>
                  {formatResourceId(policy.resource, policy.resourceId)}
                </code>
              </TableCell>
            )}
            {(allowEdit || allowDelete) && (
              <TableCell>
                <div className='flex items-center justify-end gap-1'>
                  {allowEdit && (
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => onEditClick(policy)}
                    >
                      <TbEdit className='size-4' />
                    </Button>
                  )}
                  {allowDelete && <PolicyDeleteButton policyId={policy.id} />}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
