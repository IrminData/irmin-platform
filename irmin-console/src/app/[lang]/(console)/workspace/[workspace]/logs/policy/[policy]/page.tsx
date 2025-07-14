'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { usePolicy } from '@/hooks/usePolicy';

import type { PolicyLogsLayoutParams } from './layout';

/**
 * Policy Audit Logs page
 */
export default function PolicyLogsPage() {
  const { dict } = useLocale();
  const params = useParams<PolicyLogsLayoutParams>();

  const { policyQuery } = usePolicy(params.policy);

  if (policyQuery.isLoading) return <LoadingSpinner />;
  if (policyQuery.isError)
    return (
      <div>
        {dict.common.error}: {policyQuery.error.message}
      </div>
    );
  if (!policyQuery.data?.data) return <div>{dict.common.error}</div>;

  return (
    <LogsSection
      policy={policyQuery.data.data}
      logsForType='policy'
      logsFor={policyQuery.data?.data?.id}
      title={dict.logs.policyLogs}
    />
  );
}
