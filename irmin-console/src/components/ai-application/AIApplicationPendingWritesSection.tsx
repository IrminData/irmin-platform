'use client';

import { memo, useCallback, useState } from 'react';

import {
  TbAlertCircle,
  TbCheck,
  TbChevronLeft,
  TbChevronRight,
  TbClock,
  TbEdit,
  TbFile,
  TbFileUpload,
  TbRefresh,
  TbX,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import SafeComponent from '@/components/ui/error/SafeComponent';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';

import { useAIApplicationPendingWrites } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import { cn } from '@/utils/tw';

import type {
  AIApplicationPendingWrite,
  PendingWriteStatus,
} from '@/types/core/AIApplication';

/**
 * Skeleton row for loading state
 */
const PendingWriteSkeletonRow = () => {
  return (
    <div
      className={`
        flex animate-pulse items-center gap-4 rounded-lg bg-card/80 p-3
      `}
    >
      <div
        className={`
          size-8 rounded bg-gray-300
          dark:bg-gray-700
        `}
      />
      <div className='flex-1'>
        <div
          className={`
            mb-2 h-4 w-1/3 rounded bg-gray-300
            dark:bg-gray-700
          `}
        />
        <div
          className={`
            h-3 w-2/3 rounded bg-gray-300
            dark:bg-gray-700
          `}
        />
      </div>
      <div className='flex gap-2'>
        <div
          className={`
            h-8 w-20 rounded bg-gray-300
            dark:bg-gray-700
          `}
        />
        <div
          className={`
            h-8 w-20 rounded bg-gray-300
            dark:bg-gray-700
          `}
        />
      </div>
    </div>
  );
};

/**
 * Component to display a single pending write entry
 */
const PendingWriteEntry = memo(function PendingWriteEntry({
  pendingWrite,
  locale,
  onApprove,
  onReject,
  isProcessing,
  canEdit,
}: {
  pendingWrite: AIApplicationPendingWrite;
  locale: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
  canEdit: boolean;
}) {
  const getOperationIcon = () => {
    switch (pendingWrite.operation) {
      case 'upload':
        return <TbFileUpload size={16} />;
      case 'update':
        return <TbFile size={16} />;
      case 'patch':
        return <TbEdit size={16} />;
      default:
        return <TbFile size={16} />;
    }
  };

  const getStatusBadge = (status: PendingWriteStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span
            className={`
              inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2
              py-0.5 text-xs text-yellow-600
              dark:text-yellow-400
            `}
          >
            <TbClock size={12} />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span
            className={`
              inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2
              py-0.5 text-xs text-green-600
              dark:text-green-400
            `}
          >
            <TbCheck size={12} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span
            className={`
              inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2
              py-0.5 text-xs text-red-600
              dark:text-red-400
            `}
          >
            <TbX size={12} />
            Rejected
          </span>
        );
    }
  };

  return (
    <div
      className={cn(
        `
          flex flex-col gap-3 rounded-lg bg-card/80 p-4 transition-colors
          hover:bg-card
        `,
        pendingWrite.status === 'pending' && 'border-l-2 border-yellow-500'
      )}
    >
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <div
            className={`
              flex size-8 items-center justify-center rounded-md bg-primary/10
              text-primary
            `}
          >
            {getOperationIcon()}
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <span className='font-medium capitalize'>
                {pendingWrite.operation}
              </span>
              {getStatusBadge(pendingWrite.status)}
            </div>
            <div className='mt-1 font-mono text-xs text-muted-foreground'>
              {pendingWrite.repository}/{pendingWrite.ref}/{pendingWrite.path}
            </div>
          </div>
        </div>
        <span className='text-xs text-muted-foreground'>
          {new Date(pendingWrite.created_at).toLocaleString(locale)}
        </span>
      </div>

      {/* Commit message */}
      <div className='text-sm text-muted-foreground'>
        <span className='font-medium'>Message:</span>{' '}
        {pendingWrite.commit_message}
      </div>

      {/* Content preview */}
      {pendingWrite.content_preview && (
        <div
          className={`
            max-h-24 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs
          `}
        >
          <pre className='break-all whitespace-pre-wrap'>
            {pendingWrite.content_preview}
          </pre>
        </div>
      )}

      {/* Patch operations preview */}
      {pendingWrite.patch_json && (
        <div
          className={`
            max-h-24 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs
          `}
        >
          <pre className='break-all whitespace-pre-wrap'>
            {pendingWrite.patch_json}
          </pre>
        </div>
      )}

      {/* Action buttons (only for pending items) */}
      {pendingWrite.status === 'pending' && (
        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onReject(pendingWrite.id)}
            disabled={!canEdit || isProcessing}
            className={`
              text-red-600
              hover:text-red-700
            `}
          >
            <TbX size={14} className='mr-1' />
            Reject
          </Button>
          <Button
            variant='default'
            size='sm'
            onClick={() => onApprove(pendingWrite.id)}
            disabled={!canEdit || isProcessing}
          >
            <TbCheck size={14} className='mr-1' />
            Approve
          </Button>
        </div>
      )}

      {/* Review info */}
      {pendingWrite.reviewed_by && pendingWrite.reviewed_at && (
        <div className='text-xs text-muted-foreground'>
          Reviewed by {pendingWrite.reviewed_by.first_name}{' '}
          {pendingWrite.reviewed_by.last_name} on{' '}
          {new Date(pendingWrite.reviewed_at).toLocaleString(locale)}
        </div>
      )}
    </div>
  );
});

/**
 * AI Application Pending Writes Section
 * Displays pending write operations that require human approval
 */
const AIApplicationPendingWritesSection = () => {
  return (
    <SafeComponent
      level='section'
      title='Pending Writes Error'
      description='The pending writes section encountered an error. Please try refreshing the page.'
    >
      <AIApplicationPendingWritesSectionContent />
    </SafeComponent>
  );
};

const AIApplicationPendingWritesSectionContent = () => {
  const { aiApplication } = useAIApplicationContext();
  const { dict, locale } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  // Check if user has permission to approve/reject pending writes
  const canEdit = isResourceAllowed(
    'ai_application',
    'update',
    aiApplication.id
  );

  // Check if write approval is enabled (before hook call to prevent unnecessary polling)
  const writeConfig = aiApplication.tools?.write_config;
  const approvalEnabled = writeConfig?.require_approval ?? false;

  // State for pagination
  const [page, setPage] = useState(0);
  const limit = 10;
  const offset = page * limit;

  // Fetch pending writes using the hook with pagination (only when approval is enabled)
  const { pendingWritesQuery, approveMutation, rejectMutation } =
    useAIApplicationPendingWrites(aiApplication.id, {
      limit,
      offset,
      enabled: approvalEnabled,
    });

  const pendingWrites = pendingWritesQuery.data?.data?.pending_writes ?? [];
  const total = pendingWritesQuery.data?.data?.total ?? 0;
  const isLoading = pendingWritesQuery.isLoading;
  const isError = pendingWritesQuery.isError;
  const refetch = pendingWritesQuery.refetch;
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  // Reset page to last valid page when total decreases (e.g., after approving/rejecting items)
  const totalPages = Math.ceil(total / limit);
  const [prevTotal, setPrevTotal] = useState(total);
  if (prevTotal !== total) {
    setPrevTotal(total);
    // If current page is now out of bounds, reset to last valid page
    if (total > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }

  const handleApprove = useCallback(
    async (id: string) => {
      approveMutation.mutate({ pendingWriteId: id });
    },
    [approveMutation]
  );

  const handleReject = useCallback(
    async (id: string) => {
      rejectMutation.mutate({ pendingWriteId: id });
    },
    [rejectMutation]
  );

  // Don't show section if approval is not enabled
  if (!approvalEnabled) {
    return null;
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='flex items-center gap-2'>
            <TbAlertCircle size={20} />
            {dict.aiApplication.pendingWritesTitle}
          </CardTitle>
          <CardDescription>
            {dict.aiApplication.pendingWritesDescription}
          </CardDescription>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <TbRefresh
            size={16}
            className={cn('mr-2', isLoading && 'animate-spin')}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-3'>
            {[...Array(3)].map((_, i) => (
              <PendingWriteSkeletonRow key={i} />
            ))}
          </div>
        ) : isError ? (
          <div
            className={`
              flex items-center justify-center py-8 text-muted-foreground
            `}
          >
            <TbAlertCircle className='mr-2' />
            {dict.aiApplication.pendingWritesError}
          </div>
        ) : pendingWrites.length === 0 ? (
          <div
            className={`
              flex flex-col items-center justify-center py-8
              text-muted-foreground
            `}
          >
            <TbCheck size={32} className='mb-2' />
            <p>{dict.aiApplication.noPendingWrites}</p>
          </div>
        ) : (
          <>
            <div className='space-y-3'>
              {pendingWrites.map((pw) => (
                <PendingWriteEntry
                  key={pw.id}
                  pendingWrite={pw}
                  locale={locale}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={isProcessing}
                  canEdit={canEdit}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='mt-4 flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>
                  Showing {page * limit + 1}-
                  {Math.min((page + 1) * limit, total)} of {total}
                </span>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage((prev) => prev - 1)}
                    disabled={page === 0}
                  >
                    <TbChevronLeft size={16} />
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <TbChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AIApplicationPendingWritesSection;
