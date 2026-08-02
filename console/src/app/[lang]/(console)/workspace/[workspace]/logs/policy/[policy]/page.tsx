'use client';

import { useParams } from 'next/navigation';

import LogsSection from '@/components/logs/LogsSection';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { usePolicy } from '@/hooks/api';

import type { PolicyLogsLayoutParams } from './layout';

/**
 * Policy Audit Logs page
 */
export default function PolicyLogsPage() {
  const { dict } = useLocale();
  const params = useParams<PolicyLogsLayoutParams>();

  const { policyQuery } = usePolicy(params.policy);

  if (policyQuery.isLoading) return <LoadingSpinner />;
  if (policyQuery.isError) {
    return (
      <QueryError
        error={policyQuery.error}
        onRetry={() => policyQuery.refetch()}
        title={dict.common.errors.failedToLoadPolicy}
        description={dict.common.errors.failedToLoadAgain}
      />
    );
  }
  if (!policyQuery.data?.data) {
    return (
      <LocalizedErrorDisplay
        variant='page'
        showHome={true}
        title={dict.common.errors.policyNotFound}
        description={dict.common.errors.policyNotFoundDescription}
      />
    );
  }

  return (
    <LogsSection
      policy={policyQuery.data.data}
      logsForType='policy'
      logsFor={policyQuery.data?.data?.id}
      title={dict.logs.policyLogs}
    />
  );
}
