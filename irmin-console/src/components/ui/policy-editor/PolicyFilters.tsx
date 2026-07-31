'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useLocale } from '@/context/LocaleContext';

import type {
  PolicyAction,
  PolicyEffect,
  PolicyPrincipal,
  PolicyResource,
} from '@/types/core/Policy';

import {
  POLICY_ACTIONS,
  POLICY_EFFECTS,
  POLICY_PRINCIPALS,
  POLICY_RESOURCES,
} from './constants';
import {
  formatActionName,
  formatPrincipalName,
  formatResourceName,
} from './utils';

export interface PolicyFilterState {
  effect: PolicyEffect | 'all';
  action: PolicyAction | 'all';
  principal: PolicyPrincipal | 'all';
  resource: PolicyResource | 'all';
}

interface PolicyFiltersProps {
  filters: PolicyFilterState;
  onFiltersChange: (_filters: PolicyFilterState) => void;
  showResourceFilter?: boolean;
}

/** Filter bar for policy table with dropdowns for Effect, Action, Principal, and Resource */
export default function PolicyFilters({
  filters,
  onFiltersChange,
  showResourceFilter = true,
}: PolicyFiltersProps) {
  const { dict } = useLocale();

  return (
    <div className='flex flex-wrap gap-2'>
      <Select
        value={filters.effect}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            effect: value as PolicyEffect | 'all',
          })
        }
      >
        <SelectTrigger className='w-[150px]'>
          <SelectValue placeholder={dict.policy.filterByEffect} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>{dict.policy.allEffects}</SelectItem>
          {POLICY_EFFECTS.map((effect) => (
            <SelectItem key={effect} value={effect}>
              {effect === 'allow'
                ? dict.policy.effectAllow
                : dict.policy.effectDeny}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.action}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            action: value as PolicyAction | 'all',
          })
        }
      >
        <SelectTrigger className='w-[150px]'>
          <SelectValue placeholder={dict.policy.filterByAction} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>{dict.policy.allActions}</SelectItem>
          {POLICY_ACTIONS.map((action) => (
            <SelectItem key={action} value={action}>
              {formatActionName(dict, action)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.principal}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            principal: value as PolicyPrincipal | 'all',
          })
        }
      >
        <SelectTrigger className='w-[150px]'>
          <SelectValue placeholder={dict.policy.filterByPrincipal} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>{dict.policy.allPrincipals}</SelectItem>
          {POLICY_PRINCIPALS.map((principal) => (
            <SelectItem key={principal} value={principal}>
              {formatPrincipalName(dict, principal)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showResourceFilter && (
        <Select
          value={filters.resource}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              resource: value as PolicyResource | 'all',
            })
          }
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder={dict.policy.filterByResource} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{dict.policy.allResources}</SelectItem>
            {POLICY_RESOURCES.map((resource) => (
              <SelectItem key={resource} value={resource}>
                {formatResourceName(resource)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
