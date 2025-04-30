import { notFound } from 'next/navigation';

import { getConnectionSchema } from '@/lib/actions/connections';
import { getToken } from '@/lib/getToken';

import ConnectionSchemaSection from '@/components/connection/ConnectionSchemaSection';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

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

  const pullSchema = await getConnectionSchema({
    workspace: currentWorkspace,
    connectionID,
    operation_method: 'pull',
    token,
  });

  if (!pullSchema.data) {
    notFound();
  }

  return <ConnectionSchemaSection pullSchema={pullSchema.data} />;
}
