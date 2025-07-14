'use client';

import { useMemo } from 'react';

import { TbPlus } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

import PolicyTable from './PolicyTable';
import type { PolicyEditorProps } from './types';
import { usePolicyForm } from './usePolicyForm';

export default function PolicyEditor({
  policies,
  policiesLoading,
  policiesError,
  defaultResourceType,
  defaultResourceId,
  defaultPrincipalType,
  defaultRoleId,
  defaultUserId,
  title,
  description,
  showResourceColumn = true,
  showResourceIdColumn = true,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
}: PolicyEditorProps) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  const canCreate = useMemo(
    () => isResourceAllowed(PolicyResource.Policy, PolicyAction.Create),
    [isResourceAllowed]
  );

  const canEdit = useMemo(
    () => isResourceAllowed(PolicyResource.Policy, PolicyAction.Update),
    [isResourceAllowed]
  );

  const canDelete = useMemo(
    () => isResourceAllowed(PolicyResource.Policy, PolicyAction.Delete),
    [isResourceAllowed]
  );

  const canView = useMemo(
    () => isResourceAllowed(PolicyResource.Policy, PolicyAction.Read),
    [isResourceAllowed]
  );

  const { showCreateForm, showEditForm, isCreating } = usePolicyForm({
    defaultResourceType,
    defaultResourceId,
    defaultPrincipalType,
    defaultRoleId,
    defaultUserId,
  });

  if (!canView) {
    return (
      <div className='flex flex-col gap-4 p-4'>
        <div className='flex items-center justify-center py-8'>
          <div className='text-lg text-muted-foreground'>
            {dict.common.insufficientPermissions}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>
            {title || dict.policy.title}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {description || dict.policy.description}
          </p>
        </div>
        {allowCreate && canCreate && (
          <Button onClick={showCreateForm} loading={isCreating}>
            <TbPlus className='mr-2 size-4' />
            {dict.policy.addPolicy}
          </Button>
        )}
      </div>

      <div className='w-full'>
        {policiesLoading ? (
          <div className='flex items-center justify-center py-8'>
            <LoadingSkeleton className='h-80 w-full' />
          </div>
        ) : policiesError ? (
          <div className='flex items-center justify-center py-8'>
            <div className='text-lg text-destructive'>{dict.policy.error}</div>
          </div>
        ) : policies.length === 0 ? (
          <div className='flex items-center justify-center py-8'>
            <div className='text-lg text-muted-foreground'>
              {dict.policy.noPolicies}
            </div>
          </div>
        ) : (
          <PolicyTable
            policies={policies}
            showResourceColumn={showResourceColumn}
            showResourceIdColumn={showResourceIdColumn}
            allowEdit={allowEdit && canEdit}
            allowDelete={allowDelete && canDelete}
            onEditClick={showEditForm}
          />
        )}
      </div>
    </div>
  );
}
