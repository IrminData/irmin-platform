'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflow } from '@/hooks/useWorkflow';

import { WorkflowLogsLayoutParams } from './layout';

/**
 * Workflow Audit Logs page
 */
export default function WorkflowLogsPage() {
  const { dict } = useLocale();
  const params = useParams<WorkflowLogsLayoutParams>();

  const { workflowQuery } = useWorkflow(params.workflow);

  if (workflowQuery.isLoading) return <LoadingSpinner />;
  if (workflowQuery.isError)
    return (
      <div>
        {dict.common.error}: {workflowQuery.error.message}
      </div>
    );
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
