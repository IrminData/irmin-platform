'use client';

import type React from 'react';
import { useState } from 'react';

import { TbInfoCircle } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
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

import {
  PolicyAction,
  PolicyEffect,
  PolicyPrincipal,
  PolicyResource,
} from '@/types/core/Policy';

import type { PolicyFormProps } from './types';
import { formatResourceName } from './utils';

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
}: PolicyFormProps) {
  const { dict } = useLocale();
  const [formData, setFormData] = useState(initialValues);

  if (isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

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
              <SelectItem value={PolicyEffect.Allow}>
                {dict.policy.effectAllow}
              </SelectItem>
              <SelectItem value={PolicyEffect.Deny}>
                {dict.policy.effectDeny}
              </SelectItem>
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
              <SelectItem value={PolicyAction.Create}>
                {dict.policy.actionCreate}
              </SelectItem>
              <SelectItem value={PolicyAction.Read}>
                {dict.policy.actionRead}
              </SelectItem>
              <SelectItem value={PolicyAction.Update}>
                {dict.policy.actionUpdate}
              </SelectItem>
              <SelectItem value={PolicyAction.Delete}>
                {dict.policy.actionDelete}
              </SelectItem>
            </SelectContent>
          </Select>
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
              {Object.values(PolicyResource).map((resource) => (
                <SelectItem key={resource} value={resource}>
                  {String(formatResourceName(resource))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              <TooltipContent>{dict.policy.tooltips.resourceId}</TooltipContent>
            </Tooltip>
          </div>
          <Select
            value={formData.resourceId}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, resourceId: value }))
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder={dict.policy.allResources} />
            </SelectTrigger>
            <SelectContent>
              {formData.resource === PolicyResource.Query &&
                policyResourceOptions.queries.map((query) => (
                  <SelectItem key={query.id} value={query.id}>
                    {query.label}
                  </SelectItem>
                ))}
              {(formData.resource === PolicyResource.Workflow ||
                formData.resource === PolicyResource.WorkflowRun) &&
                policyResourceOptions.workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.label}
                  </SelectItem>
                ))}
              {formData.resource === PolicyResource.Connection &&
                policyResourceOptions.connections.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.label}
                  </SelectItem>
                ))}
              {(formData.resource === PolicyResource.Repository ||
                formData.resource === PolicyResource.RepositoryBranch ||
                formData.resource === PolicyResource.RepositoryTag ||
                formData.resource === PolicyResource.RepositoryCommit ||
                formData.resource === PolicyResource.RepositoryObject) &&
                policyResourceOptions.repositories.map((repository) => (
                  <SelectItem key={repository.id} value={repository.id}>
                    {repository.label}
                  </SelectItem>
                ))}
              {formData.resource === PolicyResource.User &&
                policyResourceOptions.users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

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
                roleId:
                  value === PolicyPrincipal.Role ? prev.roleId : undefined,
                userId:
                  value === PolicyPrincipal.WorkspaceUser
                    ? prev.userId
                    : undefined,
              }))
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PolicyPrincipal.WorkspaceUser}>
                {dict.policy.principalWorkspaceUser}
              </SelectItem>
              <SelectItem value={PolicyPrincipal.Role}>
                {dict.policy.principalRole}
              </SelectItem>
              <SelectItem value={PolicyPrincipal.Everyone}>
                {dict.policy.principalEveryone}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.principal === PolicyPrincipal.Role && (
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
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.principal === PolicyPrincipal.WorkspaceUser && (
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
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email}
                  </SelectItem>
                ))}
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
