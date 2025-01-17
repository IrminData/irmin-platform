import { notFound } from 'next/navigation';

import { getConnection } from '@/lib/actions/connections';
import { getConnectorSchema } from '@/lib/actions/connectors';
import { getToken } from '@/lib/getToken';

import ConnectionSchemaSection from '@/components/connection/ConnectionSchemaSection';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import { ConnectorCapability } from '@/types/core/Connector';
import { DynamicFieldValues } from '@/types/internal/DynamicField';

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

  const pullSchema = await getConnectorSchema(
    connection.connector.id,
    ConnectorCapability.PullFullSync,
    connection.details as DynamicFieldValues,
    connection.settings as DynamicFieldValues,
    token
  );

  return <ConnectionSchemaSection pullSchema={pullSchema} />;
}
