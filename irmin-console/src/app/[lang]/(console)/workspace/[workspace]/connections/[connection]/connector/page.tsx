'use client';

import { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import ConnectorInfoModal from '@/components/connector/ConnectorInfoModal';
import { LocalizedErrorDisplay } from '@/components/ui/error/CommonErrorDisplay';
import { QueryError } from '@/components/ui/error/QueryError';
import FormPageSkeleton from '@/components/ui/loading/FormPageSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useConnection } from '@/hooks/api';

/**
 * Page for the Connection Connector - now redirects to modal
 */
export default function ConnectionConnectorPage() {
  const params = useParams();
  const router = useRouter();
  const { dict } = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const { connectionQuery } = useConnection(params.connection as string);

  // Close modal and navigate back when modal is closed
  const handleModalClose = () => {
    setIsModalOpen(false);

    // Navigate to parent connection page to ensure users stay within the application
    router.push(
      `/${params.lang}/workspace/${params.workspace}/connections/${params.connection}`
    );
  };

  if (connectionQuery.isLoading) return <FormPageSkeleton />;
  if (connectionQuery.isError) {
    return (
      <QueryError
        error={connectionQuery.error}
        onRetry={() => connectionQuery.refetch()}
        title={dict.common.errors.failedToLoadConnection}
      />
    );
  }
  if (!connectionQuery.data?.data) {
    return (
      <LocalizedErrorDisplay
        variant='page'
        title={dict.common.errors.connectionNotFound}
        description={dict.common.errors.connectionNotFoundDescription}
        showHome={true}
      />
    );
  }

  return (
    <ConnectorInfoModal
      connector={connectionQuery.data.data.connector}
      isOpen={isModalOpen}
      onClose={handleModalClose}
    />
  );
}
