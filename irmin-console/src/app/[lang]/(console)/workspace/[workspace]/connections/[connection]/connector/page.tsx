'use client';

import { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { ConnectorInfoModal } from '@/components/connector/ConnectorInfoModal';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

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
    router.push(`/${params.lang}/workspace/${params.workspace}/connections/${params.connection}`);
  };

  if (connectionQuery.isLoading) return <LoadingSpinner />;
  if (connectionQuery.isError)
    return <div>{connectionQuery.error.message}</div>;
  if (!connectionQuery.data?.data) return <div>{dict.common.error}</div>;

  return (
    <ConnectorInfoModal
      connector={connectionQuery.data.data.connector}
      isOpen={isModalOpen}
      onClose={handleModalClose}
    />
  );
}
