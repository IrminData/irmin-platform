'use client';

import React from 'react';

import { TbTrash } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { usePolicies } from '@/hooks/usePolicies';

function PolicyDeleteButton({ policyId }: { policyId: string }) {
  const { dict } = useLocale();
  const { deletePolicyMutation } = usePolicies();
  const { irminConfirm } = usePopup();

  const handleDelete = async () => {
    const confirmed = await irminConfirm(
      'warning',
      dict.policy.deletePolicyDescription
    );
    if (confirmed) {
      deletePolicyMutation.mutate(policyId);
    }
  };

  return (
    <Button variant='ghost' size='icon' onClick={handleDelete}>
      <TbTrash className='h-4 w-4' />
    </Button>
  );
}

export default React.memo(PolicyDeleteButton);
