'use client';

import type React from 'react';
import { useState } from 'react';

import { TbInfoCircle } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useLocale } from '@/context/LocaleContext';

import type {
  PolicyAction,
  PolicyEffect,
  PolicyPrincipal,
  PolicyResource,
} from '@/types/core/Policy';

import { POLICY_ACTIONS, POLICY_RESOURCES } from './constants';
import type { PolicyFormProps } from './types';
import { formatActionName, formatResourceName } from './utils';

function getValidSelectItemValue(
  value: string | undefined | null
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export default function PolicyForm({
  isEditMode = false,
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  isSubmitting,
  roles,
  users,
  policyResourceOptions,
  onBatchSubmit,
}: PolicyFormProps) {
  const { dict } = useLocale();
  const [formData, setFormData] = useState(initialValues);
  const [selectedActions, setSelectedActions] = useState<string[]>([
    initialValues.action,
  ]);
  const [selectedResources, setSelectedResources] = useState<string[]>([
    initialValues.resource,
  ]);

  if (isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode && onBatchSubmit) {
      // Only include resourceId when a single resource type is selected,
      // since a resourceId is scoped to one resource type
      const batchResourceId =
        selectedResources.length === 1 ? formData.resourceId : undefined;
      onBatchSubmit({
        effect: formData.effect,
        actions: selectedActions as PolicyAction[],
        resources: selectedResources as PolicyResource[],
        principal: formData.principal,
        resourceId: batchResourceId,
        roleId: formData.roleId,
        userId: formData.userId,
      });
    } else {
      onSubmit(formData);
    }
  };

  const isBatchMode = !isEditMode && !!onBatchSubmit;

  // In batch mode, derive the effective resource type for the resource ID dropdown.
  // Only show the dropdown when exactly one resource type is selected.
  const effectiveResource = isBatchMode
    ? selectedResources.length === 1
      ? (selectedResources[0] as PolicyResource)
      : null
    : formData.resource;

  const actionOptions = POLICY_ACTIONS.map((action) => ({
    label: formatActionName(dict, action),
    value: action,
  }));

  const resourceOptions = POLICY_RESOURCES.map((resource) => ({
    label: formatResourceName(resource),
    value: resource,
  }));

  return (
    <form className='flex flex-col gap-4 pb-8' onSubmit={handleSubmit}>
      <TooltipProvider>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Label htmlFor='effect'>{dict.policy.effect}</Label>
            <Tooltip>
              <TooltipTrigger>
                <TbInfoCircle
                  className='cursor-help text-muted-foreground'
                  size={16}
                />
              </TooltipTrigger>
              <TooltipContent>{dict.policy.tooltips.effect}</TooltipContent>
            </Tooltip>
          </div>
          <Select
            value={formData.effect}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                effect: value as PolicyEffect,
              }))
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={'allow'}>{dict.policy.effectAllow}</SelectItem>
              <SelectItem value={'deny'}>{dict.policy.effectDeny}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Label htmlFor='action'>{dict.policy.action}</Label>
            <Tooltip>
              <TooltipTrigger>
                <TbInfoCircle
                  className='cursor-help text-muted-foreground'
                  size={16}
                />
              </TooltipTrigger>
              <TooltipContent>{dict.policy.tooltips.action}</TooltipContent>
            </Tooltip>
          </div>
          {isBatchMode ? (
            <MultiSelect
              options={actionOptions}
              defaultValue={selectedActions}
              onValueChange={setSelectedActions}
              placeholder={dict.policy.action}
              maxCount={4}
            />
          ) : (
            <Select
              value={formData.action}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  action: value as PolicyAction,
                }))
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POLICY_ACTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {formatActionName(dict, action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Label htmlFor='resource'>{dict.policy.resource}</Label>
            <Tooltip>
              <TooltipTrigger>
                <TbInfoCircle
                  className='cursor-help text-muted-foreground'
                  size={16}
                />
              </TooltipTrigger>
              <TooltipContent>{dict.policy.tooltips.resource}</TooltipContent>
            </Tooltip>
          </div>
          {isBatchMode ? (
            <MultiSelect
              options={resourceOptions}
              defaultValue={selectedResources}
              onValueChange={(values) => {
                setSelectedResources(values);
                setFormData((prev) => ({ ...prev, resourceId: undefined }));
              }}
              placeholder={dict.policy.resource}
              maxCount={3}
            />
          ) : (
            <Select
              value={formData.resource}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  resource: value as PolicyResource,
                }))
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POLICY_RESOURCES.map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {formatResourceName(resource)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {effectiveResource && (
          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-2'>
              <Label htmlFor='resourceId'>{dict.policy.resourceId}</Label>
              <Tooltip>
                <TooltipTrigger>
                  <TbInfoCircle
                    className='cursor-help text-muted-foreground'
                    size={16}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {dict.policy.tooltips.resourceId}
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={formData.resourceId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, resourceId: value }))
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder={dict.common.all} />
              </SelectTrigger>
              <SelectContent>
                {effectiveResource === 'script' &&
                  policyResourceOptions.scripts.map((script) => {
                    const optionValue = getValidSelectItemValue(script.id);
                    if (!optionValue) {
                      return null;
                    }

                    return (
                      <SelectItem key={optionValue} value={optionValue}>
                        {script.label}
                      </SelectItem>
                    );
                  })}
                {effectiveResource === 'query' &&
                  policyResourceOptions.queries.map((query) => {
                    const optionValue = getValidSelectItemValue(query.id);
                    if (!optionValue) {
                      return null;
                    }

                    return (
                      <SelectItem key={optionValue} value={optionValue}>
                        {query.label}
                      </SelectItem>
                    );
                  })}
                {(effectiveResource === 'workflow' ||
                  effectiveResource === 'workflow_run') &&
                  policyResourceOptions.workflows.map((workflow) => {
                    const optionValue = getValidSelectItemValue(workflow.id);
                    if (!optionValue) {
                      return null;
                    }

                    return (
                      <SelectItem key={optionValue} value={optionValue}>
                        {workflow.label}
                      </SelectItem>
                    );
                  })}
                {effectiveResource === 'connection' &&
                  policyResourceOptions.connections.map((connection) => {
                    const optionValue = getValidSelectItemValue(connection.id);
                    if (!optionValue) {
                      return null;
                    }

                    return (
                      <SelectItem key={optionValue} value={optionValue}>
                        {connection.label}
                      </SelectItem>
                    );
                  })}
                {(effectiveResource === 'repository' ||
                  effectiveResource === 'repository_branch' ||
                  effectiveResource === 'repository_tag' ||
                  effectiveResource === 'repository_commit' ||
                  effectiveResource === 'repository_object') &&
                  policyResourceOptions.repositories.map((repository) => {
                    const optionValue = getValidSelectItemValue(repository.id);
                    if (!optionValue) {
                      return null;
                    }

                    return (
                      <SelectItem key={optionValue} value={optionValue}>
                        {repository.label}
                      </SelectItem>
                    );
                  })}
                {effectiveResource === 'user' &&
                  policyResourceOptions.users.map((user) => {
                    const optionValue = getValidSelectItemValue(user.id);
                    if (!optionValue) {
                      return null;
                    }

                    return (
                      <SelectItem key={optionValue} value={optionValue}>
                        {user.label}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Label htmlFor='principal'>{dict.policy.principal}</Label>
            <Tooltip>
              <TooltipTrigger>
                <TbInfoCircle
                  className='cursor-help text-muted-foreground'
                  size={16}
                />
              </TooltipTrigger>
              <TooltipContent>{dict.policy.tooltips.principal}</TooltipContent>
            </Tooltip>
          </div>
          <Select
            value={formData.principal}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                principal: value as PolicyPrincipal,
                // Clear roleId and userId when principal changes
                roleId: value === 'role' ? prev.roleId : undefined,
                userId: value === 'workspace_user' ? prev.userId : undefined,
              }))
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={'workspace_user'}>
                {dict.policy.principalWorkspaceUser}
              </SelectItem>
              <SelectItem value={'role'}>
                {dict.policy.principalRole}
              </SelectItem>
              <SelectItem value={'everyone'}>
                {dict.policy.principalEveryone}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.principal === 'role' && (
          <div className='flex flex-col gap-2'>
            <Label htmlFor='roleId'>{dict.policy.principalRole}</Label>
            <Select
              value={formData.roleId || ''}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, roleId: value }))
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles
                  .filter((role) => !role.isOwner)
                  .map((role) => {
                    const optionValue = getValidSelectItemValue(role.id);
                    if (!optionValue) {
                      return null;
                    }

                    return (
                      <SelectItem key={optionValue} value={optionValue}>
                        {role.role}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.principal === 'workspace_user' && (
          <div className='flex flex-col gap-2'>
            <Label htmlFor='userId'>{dict.policy.principalWorkspaceUser}</Label>
            <Select
              value={formData.userId || ''}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, userId: value }))
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => {
                  const optionValue = getValidSelectItemValue(user.id);
                  if (!optionValue) {
                    return null;
                  }

                  return (
                    <SelectItem key={optionValue} value={optionValue}>
                      {user.email}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </TooltipProvider>

      <div className='flex justify-end gap-2 pt-4'>
        <Button
          type='button'
          variant='outline'
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {dict.common.cancel}
        </Button>
        <Button type='submit' loading={isSubmitting}>
          {isEditMode ? dict.common.save : dict.common.create}
        </Button>
      </div>
    </form>
  );
}
