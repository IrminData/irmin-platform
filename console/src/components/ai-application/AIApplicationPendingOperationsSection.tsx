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
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';

import { useAIApplicationPendingOperations } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import { cn } from '@/utils/tw';

import type {
  AIApplicationPendingOperation,
  PendingOperationStatus,
} from '@/types/core/AIApplication';

/**
 * Skeleton row for loading state
 */
const PendingOperationSkeletonRow = () => {
  return (
    <div
      className={`
        flex animate-pulse items-center gap-4 rounded-lg bg-card/80 p-3
      `}
    >
      <div
        className={`
          size-8 rounded-sm bg-gray-300
          dark:bg-gray-700
        `}
      />
      <div className='flex-1'>
        <div
          className={`
            mb-2 h-4 w-1/3 rounded-sm bg-gray-300
            dark:bg-gray-700
          `}
        />
        <div
          className={`
            h-3 w-2/3 rounded-sm bg-gray-300
            dark:bg-gray-700
          `}
        />
      </div>
      <div className='flex gap-2'>
        <div
          className={`
            h-8 w-20 rounded-sm bg-gray-300
            dark:bg-gray-700
          `}
        />
        <div
          className={`
            h-8 w-20 rounded-sm bg-gray-300
            dark:bg-gray-700
          `}
        />
      </div>
    </div>
  );
};

/**
 * Component to display a single pending operation entry
 */
const PendingOperationEntry = memo(function PendingOperationEntry({
  pendingOperation,
  locale,
  onApprove,
  onReject,
  isProcessing,
  canEdit,
}: {
  pendingOperation: AIApplicationPendingOperation;
  locale: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
  canEdit: boolean;
}) {
  const { dict } = useLocale();

  const getOperationIcon = () => {
    switch (pendingOperation.operation) {
      case 'upload':
        return <TbFileUpload aria-hidden='true' size={16} />;
      case 'update':
        return <TbFile aria-hidden='true' size={16} />;
      case 'patch':
        return <TbEdit aria-hidden='true' size={16} />;
      default:
        return <TbFile aria-hidden='true' size={16} />;
    }
  };

  const getStatusBadge = (status: PendingOperationStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span
            className={`
              inline-flex items-center gap-1 rounded-full border
              border-warning/30 bg-warning/10 px-2 py-0.5 text-xs
              text-foreground
            `}
          >
            <TbClock aria-hidden='true' size={12} />
            {dict.aiApplication.pendingStatus}
          </span>
        );
      case 'completed':
        return (
          <span
            className={`
              inline-flex items-center gap-1 rounded-full border
              border-success/30 bg-success/10 px-2 py-0.5 text-xs
              text-foreground
            `}
          >
            <TbCheck aria-hidden='true' size={12} />
            {dict.aiApplication.completedStatus}
          </span>
        );
      case 'executing':
        return (
          <span
            className={`
              inline-flex items-center gap-1 rounded-full border
              border-accent/30 bg-accent/10 px-2 py-0.5 text-xs text-foreground
            `}
          >
            <TbClock aria-hidden='true' size={12} />
            {dict.aiApplication.executingStatus}
          </span>
        );
      case 'failed':
      case 'rejected':
        return (
          <span
            className={`
              inline-flex items-center gap-1 rounded-full border
              border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs
              text-foreground
            `}
          >
            <TbX aria-hidden='true' size={12} />
            {status === 'failed'
              ? dict.aiApplication.failedStatus
              : dict.aiApplication.rejectedStatus}
          </span>
        );
    }
  };

  return (
    <div
      className={cn(
        `
          flex flex-col gap-3 rounded-[2px] bg-card/80 p-4 transition-colors
          hover:bg-card
        `,
        pendingOperation.status === 'pending' && 'border-l-2 border-warning'
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
                {pendingOperation.operation}
              </span>
              {getStatusBadge(pendingOperation.status)}
            </div>
            <div className='mt-1 font-mono text-xs text-muted-foreground'>
              {pendingOperation.repository}/{pendingOperation.ref}/
              {pendingOperation.path}
            </div>
          </div>
        </div>
        <span className='text-xs text-muted-foreground'>
          {new Date(pendingOperation.created_at).toLocaleString(locale)}
        </span>
      </div>

      {/* Commit message */}
      <div className='text-sm text-muted-foreground'>
        <span className='font-medium'>{dict.aiApplication.commitMessage}:</span>{' '}
        {pendingOperation.commit_message}
      </div>

      {/* Content preview */}
      {pendingOperation.content_preview && (
        <div
          className={`
            max-h-24 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs
          `}
        >
          <pre className='break-all whitespace-pre-wrap'>
            {pendingOperation.content_preview}
          </pre>
        </div>
      )}

      {/* Patch operations preview */}
      {pendingOperation.patch_json && (
        <div
          className={`
            max-h-24 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs
          `}
        >
          <pre className='break-all whitespace-pre-wrap'>
            {pendingOperation.patch_json}
          </pre>
        </div>
      )}

      {/* Action buttons (only for pending items) */}
      {pendingOperation.status === 'pending' && (
        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onReject(pendingOperation.id)}
            disabled={!canEdit || isProcessing}
            className={`
              text-destructive
              hover:text-destructive/80
            `}
          >
            <TbX aria-hidden='true' size={14} className='mr-1' />
            {dict.aiApplication.rejectOperation}
          </Button>
          <Button
            variant='accent'
            size='sm'
            onClick={() => onApprove(pendingOperation.id)}
            disabled={!canEdit || isProcessing}
          >
            <TbCheck aria-hidden='true' size={14} className='mr-1' />
            {dict.aiApplication.approveOperation}
          </Button>
        </div>
      )}

      {/* Review info */}
      {pendingOperation.reviewed_by && pendingOperation.reviewed_at && (
        <div className='text-xs text-muted-foreground'>
          {dict.aiApplication.reviewedByOn
            .replace(
              '{name}',
              `${pendingOperation.reviewed_by.first_name} ${pendingOperation.reviewed_by.last_name}`
            )
            .replace(
              '{date}',
              new Date(pendingOperation.reviewed_at).toLocaleString(locale)
            )}
        </div>
      )}
    </div>
  );
});

/**
 * AI Application Pending Operations Section
 * Displays pending operations that require human approval
 */
const AIApplicationPendingOperationsSection = () => {
  return (
    <SafeComponent
      level='section'
      titleKey='pendingOperationsTitle'
      descriptionKey='pendingOperationsDescription'
    >
      <AIApplicationPendingOperationsSectionContent />
    </SafeComponent>
  );
};

const AIApplicationPendingOperationsSectionContent = () => {
  const { aiApplication } = useAIApplicationContext();
  const { dict, locale } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  // Check if user has permission to approve/reject pending operations
  const canEdit = isResourceAllowed(
    'ai_application',
    'update',
    aiApplication.id
  );

  // Ordinary writes use this setting, while destructive tools can stage operations regardless.
  const writeConfig = aiApplication.tools?.write_config;
  const approvalEnabled = writeConfig?.require_approval ?? false;

  // State for pagination
  const [page, setPage] = useState(0);
  const limit = 10;
  const offset = page * limit;

  // Always check for staged operations because destructive tools require approval independently.
  const { pendingOperationsQuery, approveMutation, rejectMutation } =
    useAIApplicationPendingOperations(aiApplication.id, {
      limit,
      offset,
      enabled: true,
    });

  const pendingOperations =
    pendingOperationsQuery.data?.data?.pending_operations ?? [];
  const total = pendingOperationsQuery.data?.data?.total ?? 0;
  const isLoading = pendingOperationsQuery.isLoading;
  const isError = pendingOperationsQuery.isError;
  const refetch = pendingOperationsQuery.refetch;
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  const totalPages = Math.ceil(total / limit);

  const returnToPreviousPageIfLastItem = useCallback(() => {
    if (page > 0 && pendingOperations.length === 1) {
      setPage((previousPage) => previousPage - 1);
    }
  }, [page, pendingOperations.length]);

  const handleApprove = useCallback(
    async (id: string) => {
      approveMutation.mutate(
        { pendingOperationId: id },
        { onSuccess: returnToPreviousPageIfLastItem }
      );
    },
    [approveMutation, returnToPreviousPageIfLastItem]
  );

  const handleReject = useCallback(
    async (id: string) => {
      rejectMutation.mutate(
        { pendingOperationId: id },
        { onSuccess: returnToPreviousPageIfLastItem }
      );
    },
    [rejectMutation, returnToPreviousPageIfLastItem]
  );

  // Avoid an empty card when ordinary-write approval is disabled and nothing is staged.
  if (!approvalEnabled && !isLoading && total === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='flex items-center gap-2'>
            <TbAlertCircle size={20} />
            {dict.aiApplication.pendingOperationsTitle}
          </CardTitle>
          <CardDescription>
            {dict.aiApplication.pendingOperationsDescription}
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
              <PendingOperationSkeletonRow key={i} />
            ))}
          </div>
        ) : isError ? (
          <QueryError
            error={pendingOperationsQuery.error}
            onRetry={() => refetch()}
            title={dict.common.errors.failedToLoadPendingOperations}
            description={dict.common.errors.failedToLoadAgain}
            size='sm'
          />
        ) : pendingOperations.length === 0 ? (
          <div
            className={`
              flex flex-col items-center justify-center py-8
              text-muted-foreground
            `}
          >
            <TbCheck size={32} className='mb-2' />
            <p>{dict.aiApplication.noPendingOperations}</p>
          </div>
        ) : (
          <>
            <div className='space-y-3'>
              {pendingOperations.map((pw) => (
                <PendingOperationEntry
                  key={pw.id}
                  pendingOperation={pw}
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
                  {dict.aiApplication.pendingOperationsShowing
                    .replace('{start}', String(page * limit + 1))
                    .replace(
                      '{end}',
                      String(Math.min((page + 1) * limit, total))
                    )
                    .replace('{total}', String(total))}
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

export default AIApplicationPendingOperationsSection;
