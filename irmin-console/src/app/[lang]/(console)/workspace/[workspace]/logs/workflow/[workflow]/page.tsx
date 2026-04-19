'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflow } from '@/hooks/api';

import type { WorkflowLogsLayoutParams } from './layout';

/**
 * Workflow Audit Logs page
 */
export default function WorkflowLogsPage() {
  const { dict } = useLocale();
  const params = useParams<WorkflowLogsLayoutParams>();

  const { workflowQuery } = useWorkflow(params.workflow);

  if (workflowQuery.isLoading) return <ListSkeleton />;
  if (workflowQuery.isError) {
    return (
      <QueryError
        error={workflowQuery.error}
        onRetry={() => workflowQuery.refetch()}
        title={dict.common.errors.failedToLoadWorkflow}
      />
    );
  }
  if (!workflowQuery.data?.data) {
    return (
      <LocalizedErrorDisplay
        variant='page'
        title={dict.common.errors.workflowNotFound}
        description={dict.common.errors.workflowNotFoundDescription}
        showHome={true}
      />
    );
  }

  return (
    <LogsSection
      workflow={workflowQuery.data.data}
      logsForType='workflow'
      logsFor={workflowQuery.data.data.id}
      title={dict.logs.workflowLogs}
    />
  );
}
