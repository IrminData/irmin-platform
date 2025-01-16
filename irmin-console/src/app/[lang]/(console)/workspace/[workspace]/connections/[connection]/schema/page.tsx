import { notFound } from 'next/navigation';

import { getConnection } from '@/lib/actions/connections';
import { getConnectorSchema } from '@/lib/actions/connectors';
import { getToken } from '@/lib/getToken';

import ConnectionSchemaSection from '@/components/connection/ConnectionSchemaSection';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import { ConnectorCapability } from '@/types/core/Connector';

import { SingleConnectionLayoutParams } from '../layout';

/**
 * Page for the Connection Schema
 */
export default async function ConnectionSchemaPage(props: {
  params: Promise<SingleConnectionLayoutParams>;
}) {
  const params = await props.params;

  const connectionID = params.connection;
  if (isInvalidRouteProp(connectionID)) return notFound();

  const token = await getToken();
  const connection = await getConnection(connectionID, token);

  if (!connection) return notFound();

  let parsedDetails = {};
  let parsedSettings = {};
  try {
    parsedDetails = JSON.parse(connection.details ?? '{}');
    parsedSettings = JSON.parse(connection.settings ?? '{}');
  } catch (error) {
    console.error('Error parsing connection details or settings:', error);
  }

  const pullSchema = await getConnectorSchema(
    connection.connector.id,
    ConnectorCapability.PullFullSync,
    parsedDetails,
    parsedSettings,
    token
  );

  return <ConnectionSchemaSection pullSchema={pullSchema} />;
}
