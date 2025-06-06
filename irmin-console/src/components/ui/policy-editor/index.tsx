'use client';

import React from 'react';

import { TbPlus } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import PolicyTable from './PolicyTable';
import { PolicyEditorProps } from './types';
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
  const { showCreateForm, showEditForm, isCreating } = usePolicyForm({
    defaultResourceType,
    defaultResourceId,
    defaultPrincipalType,
    defaultRoleId,
    defaultUserId,
  });

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>
            {title || dict.policy.title}
          </h2>
          <p className='text-muted-foreground text-sm'>
            {description || dict.policy.description}
          </p>
        </div>
        {allowCreate && (
          <Button onClick={showCreateForm} loading={isCreating}>
            <TbPlus className='mr-2 h-4 w-4' />
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
            <div className='text-destructive text-lg'>{dict.policy.error}</div>
          </div>
        ) : policies.length === 0 ? (
          <div className='flex items-center justify-center py-8'>
            <div className='text-muted-foreground text-lg'>
              {dict.policy.noPolicies}
            </div>
          </div>
        ) : (
          <PolicyTable
            policies={policies}
            showResourceColumn={showResourceColumn}
            showResourceIdColumn={showResourceIdColumn}
            allowEdit={allowEdit}
            allowDelete={allowDelete}
            onEditClick={showEditForm}
          />
        )}
      </div>
    </div>
  );
}
