'use client';

import { memo } from 'react';

import { TbTrash } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { usePolicies } from '@/hooks/api';

function PolicyDeleteButton({ policyId }: { policyId: string }) {
  const { dict } = useLocale();
  const { deletePolicyMutation } = usePolicies({});
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
      <TbTrash className='size-4' />
    </Button>
  );
}

export default memo(PolicyDeleteButton);
