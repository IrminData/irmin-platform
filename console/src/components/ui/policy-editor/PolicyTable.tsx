import type React from 'react';
import { useCallback, useMemo, useState } from 'react';

import {
  TbChevronDown,
  TbChevronUp,
  TbEdit,
  TbInfoCircle,
  TbSelector,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  'action' | 'effect' | 'principal' | 'resource' | 'resourceId';
type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: SortableColumn | null;
  direction: SortDirection;
}

function SortableHeader({
  column,
  children,
  sortState,
  onSort,
}: {
  column: SortableColumn;
  children: React.ReactNode;
  sortState: SortState;
  onSort: (column: SortableColumn) => void;
}) {
  const getSortIcon = () => {
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

  return (
    <div
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(column);
        }
      }}
      className={`
        flex cursor-pointer items-center gap-2 transition-colors select-none
        hover:text-foreground
      `}
      onClick={() => onSort(column)}
    >
      {children}
      {getSortIcon()}
    </div>
  );
}

export default function PolicyTable({
  policies,
  showResourceColumn = true,
  showResourceIdColumn = true,
  allowEdit = true,
  allowDelete = true,
  onEditClick,
  selectable = false,
  selectedIds,
  onSelectionChange,
}: PolicyTableProps) {
  const { dict } = useLocale();

  const { policyResourceOptionsQuery } = usePolicyResourceOptions();

  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const selectablePolicies = useMemo(
    () => policies.filter((p) => !p.role?.isOwner),
    [policies]
  );
  const selectablePolicyIds = useMemo(
    () => new Set(selectablePolicies.map((p) => p.id)),
    [selectablePolicies]
  );
  const selectedVisibleCount = useMemo(() => {
    if (!selectedIds) return 0;
    let count = 0;
    for (const id of selectedIds) {
      if (selectablePolicyIds.has(id)) count++;
    }
    return count;
  }, [selectedIds, selectablePolicyIds]);
  const allSelected =
    selectable &&
    selectablePolicies.length > 0 &&
    selectedVisibleCount === selectablePolicies.length;
  const someSelected = selectable && selectedVisibleCount > 0 && !allSelected;

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(selectablePolicies.map((p) => p.id)));
    }
  }, [allSelected, onSelectionChange, selectablePolicies]);

  const handleSelectOne = useCallback(
    (policyId: string) => {
      if (!onSelectionChange || !selectedIds) return;
      const next = new Set(selectedIds);
      if (next.has(policyId)) {
        next.delete(policyId);
      } else {
        next.add(policyId);
      }
      onSelectionChange(next);
    },
    [onSelectionChange, selectedIds]
  );

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

  const formatResourceId = (
    resourceType: PolicyResource,
    resourceId?: string
  ) => {
    if (!resourceId) {
      return dict.common.all;
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
          {selectable && (
            <TableHead className='w-[40px]'>
              <Checkbox
                checked={
                  allSelected ? true : someSelected ? 'indeterminate' : false
                }
                disabled={selectablePolicies.length === 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
          )}
          <TableHead className='max-w-[80]'>
            <SortableHeader
              column='effect'
              sortState={sortState}
              onSort={handleSort}
            >
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
            <SortableHeader
              column='action'
              sortState={sortState}
              onSort={handleSort}
            >
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
            <SortableHeader
              column='principal'
              sortState={sortState}
              onSort={handleSort}
            >
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
              <SortableHeader
                column='resource'
                sortState={sortState}
                onSort={handleSort}
              >
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
              <SortableHeader
                column='resourceId'
                sortState={sortState}
                onSort={handleSort}
              >
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
          <TableRow
            key={policy.id}
            className={
              policy.effect === 'deny'
                ? 'border-l-2 border-l-destructive bg-destructive/5'
                : undefined
            }
          >
            {selectable && (
              <TableCell className='w-[40px]'>
                {policy.role?.isOwner ? null : (
                  <Checkbox
                    checked={selectedIds?.has(policy.id) ?? false}
                    onCheckedChange={() => handleSelectOne(policy.id)}
                  />
                )}
              </TableCell>
            )}
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
                <code className='rounded-sm bg-muted px-1 py-0.5 text-xs'>
                  {formatResourceId(policy.resource, policy.resourceId)}
                </code>
              </TableCell>
            )}
            {(allowEdit || allowDelete) && (
              <TableCell>
                {policy.role?.isOwner ? (
                  <div className='flex items-center justify-end'>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className='text-xs text-muted-foreground'>
                            {dict.policy.ownerRoleProtected}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {dict.policy.ownerRoleProtected}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <div className='flex items-center justify-end gap-1'>
                    {allowEdit && (
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => onEditClick(policy)}
                        aria-label='Edit policy'
                      >
                        <TbEdit className='size-4' />
                      </Button>
                    )}
                    {allowDelete && <PolicyDeleteButton policyId={policy.id} />}
                  </div>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
