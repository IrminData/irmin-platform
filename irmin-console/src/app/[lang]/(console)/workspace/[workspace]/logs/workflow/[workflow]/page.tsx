'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflow } from '@/hooks/useWorkflow';

/**
 * Workflow Audit Logs page
 */
export default function WorkflowLogsPage() {
  const { dict } = useLocale();
  const params = useParams();

  const { workflowQuery } = useWorkflow(params.workflow as string);

  if (workflowQuery.isLoading) return <LoadingSpinner />;
  if (workflowQuery.isError) return <div>{workflowQuery.error.message}</div>;
  if (!workflowQuery.data?.data) return <div>{dict.common.error}</div>;

  return (
    <LogsSection
      workflow={workflowQuery.data.data}
      logsForType='workflow'
      logsFor={workflowQuery.data.data.id}
      title={dict.logs.workflowLogs}
    />
  );
}
