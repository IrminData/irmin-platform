import { notFound } from 'next/navigation';

import { getConnection } from '@/lib/actions/connections';
import { getToken } from '@/lib/getToken';

import ConnectorSection from '@/components/connector/ConnectorSection';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import { SingleConnectionLayoutParams } from '../layout';

/**
 * Page for the Connection Connector
 */
export default async function ConnectionConnectorPage(props: {
  params: Promise<SingleConnectionLayoutParams>;
}) {
  const params = await props.params;

  const connectionID = params.connection;
  if (isInvalidRouteProp(connectionID)) return notFound();

  const token = await getToken();
  const connection = await getConnection(connectionID, token);

  if (!connection) return notFound();

  const connector = connection.connector;

  return <ConnectorSection connector={connector} />;
}
