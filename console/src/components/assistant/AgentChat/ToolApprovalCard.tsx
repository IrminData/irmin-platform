'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';

interface ToolApprovalCardProps {
  toolName?: string;
  pendingOperationId?: string;
  workspaceSlug?: string;
  approvalPreview?: string;
}

export const ToolApprovalCard = ({
  toolName,
  pendingOperationId,
  workspaceSlug,
  approvalPreview,
}: ToolApprovalCardProps) => {
  const { dict } = useLocale();
  const { getCore } = useIrminCore();
  const [status, setStatus] = useState<
    'pending' | 'working' | 'approved' | 'rejected' | 'failed'
  >('pending');

  const review = async (action: 'approve' | 'reject') => {
    if (!pendingOperationId || !workspaceSlug || status !== 'pending') return;
    setStatus('working');
    try {
      const core = await getCore();
      await core.reviewMCPPendingOperation(
        workspaceSlug,
        pendingOperationId,
        action
      );
      setStatus(action === 'approve' ? 'approved' : 'rejected');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <div
      role='status'
      className='
        mt-4 rounded-[2px] border border-warning/30 bg-warning/10 p-3 text-sm
      '
    >
      <div className='font-medium'>{toolName}</div>
      <div className='mt-1 text-muted-foreground'>
        {approvalPreview || dict.assistant.approvalRequired}
      </div>
      {status === 'pending' && pendingOperationId && workspaceSlug ? (
        <div className='mt-3 flex justify-end gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => void review('reject')}
          >
            {dict.assistant.rejectOperation}
          </Button>
          <Button
            size='sm'
            variant='accent'
            onClick={() => void review('approve')}
          >
            {dict.assistant.approveOperation}
          </Button>
        </div>
      ) : (
        <div className='mt-2 text-muted-foreground' aria-live='polite'>
          {status === 'working'
            ? dict.assistant.reviewingOperation
            : status === 'approved'
              ? dict.assistant.operationApproved
              : status === 'rejected'
                ? dict.assistant.operationRejected
                : dict.assistant.operationReviewFailed}
        </div>
      )}
    </div>
  );
};
