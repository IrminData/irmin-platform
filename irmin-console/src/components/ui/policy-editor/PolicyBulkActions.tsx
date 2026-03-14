'use client';

import { useCallback, useState } from 'react';

import { TbTrash, TbX } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { usePolicies } from '@/hooks/api';

interface PolicyBulkActionsProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

/** Bulk action bar shown when one or more policy rows are selected */
export default function PolicyBulkActions({
  selectedIds,
  onSelectionChange,
}: PolicyBulkActionsProps) {
  const { dict } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const { deletePolicyMutation } = usePolicies({
    silent: true,
    mutationsOnly: true,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      dict.policy.bulkDeleteConfirm
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) => deletePolicyMutation.mutateAsync(id))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed > 0) {
      irminAlert(
        'error',
        `${dict.policy.bulkDeleteSuccess}: ${String(succeeded)} / ${String(ids.length)}. ${String(failed)} ${dict.policy.failedCount}.`
      );
    } else {
      irminAlert(
        'success',
        `${dict.policy.bulkDeleteSuccess}: ${String(succeeded)} / ${String(ids.length)}`
      );
    }

    setIsDeleting(false);
    if (failed > 0) {
      // Keep only the IDs that failed so the user can retry
      const failedIds = new Set(
        ids.filter((_, i) => results[i].status === 'rejected')
      );
      onSelectionChange(failedIds);
    } else {
      onSelectionChange(new Set());
    }
  }, [
    selectedIds,
    irminConfirm,
    irminAlert,
    dict.policy.bulkDeleteConfirm,
    dict.policy.bulkDeleteSuccess,
    dict.policy.failedCount,
    deletePolicyMutation,
    onSelectionChange,
  ]);

  return (
    <div
      className='
        my-2 flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2
      '
    >
      <span className='text-sm font-medium'>
        {selectedIds.size} {dict.policy.policiesSelected}
      </span>
      <Button
        variant='destructive'
        size='sm'
        onClick={handleBulkDelete}
        loading={isDeleting}
      >
        <TbTrash className='mr-1 size-4' />
        {dict.policy.bulkDelete}
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => onSelectionChange(new Set())}
      >
        <TbX className='mr-1 size-4' />
        {dict.policy.clearSelection}
      </Button>
    </div>
  );
}
