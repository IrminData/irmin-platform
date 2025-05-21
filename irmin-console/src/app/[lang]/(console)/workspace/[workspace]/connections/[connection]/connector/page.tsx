'use client';

import { useParams } from 'next/navigation';

import ConnectorSection from '@/components/connector/ConnectorSection';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import { useConnection } from '@/hooks/useConnection';

/**
 * Page for the Connection Connector
 */
export default function ConnectionConnectorPage() {
  const params = useParams();
  const { dict } = useLocale();

  const { connectionQuery } = useConnection(params.connection as string);
  if (connectionQuery.isLoading) return <LoadingSpinner />;
  if (connectionQuery.isError)
    return <div>{connectionQuery.error.message}</div>;
  if (!connectionQuery.data?.data) return <div>{dict.common.error}</div>;

  return (
    <ConnectorSection connectorID={connectionQuery.data.data.connector.id} />
  );
}
