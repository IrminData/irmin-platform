import { notFound } from 'next/navigation';

import { getConnection } from '@/lib/actions/connections';
import { getConnectorSchema } from '@/lib/actions/connectors';
import { getToken } from '@/lib/getToken';

import ConnectionSchemaSection from '@/components/connection/ConnectionSchemaSection';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import { DynamicFieldValues } from '@/types/internal/DynamicField';

import { SingleConnectionLayoutParams } from '../layout';

/**
 * Page for the Connection Schema
 */
export default async function ConnectionSchemaPage(props: {
  params: Promise<SingleConnectionLayoutParams>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;

  const connectionID = params.connection;
  if (isInvalidRouteProp(connectionID)) return notFound();

  const token = await getToken();
  const connection = await getConnection({
    workspace: currentWorkspace,
    connectionID,
    token,
  });

  if (!connection.data) return notFound();

  const pullSchema = await getConnectorSchema({
    connectorId: connection.data.connector.id,
    operation: 'pull',
    details: connection.data.details as DynamicFieldValues,
    settings: connection.data.settings as DynamicFieldValues,
    token,
  });

  return <ConnectionSchemaSection pullSchema={pullSchema.data} />;
}
