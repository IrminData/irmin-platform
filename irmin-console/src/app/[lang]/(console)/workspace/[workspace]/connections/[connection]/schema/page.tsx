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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const currentWorkspace = params.workspace;

  const connectionID = params.connection;
  if (isInvalidRouteProp(connectionID)) return notFound();

  // Get path and operation method from query params
  const searchParams = await props.searchParams;
  const path =
    typeof searchParams.path === 'string' ? searchParams.path : undefined;
  const operationMethod =
    typeof searchParams.method === 'string' ? searchParams.method : 'pull';

  // Get the schema
  const token = await getToken();
  const pullSchema = await getConnectionSchema({
    workspace: currentWorkspace,
    connectionID,
    operationMethod,
    token,
  });

  if (!pullSchema.data) {
    notFound();
  }

  return (
    <ConnectionSchemaSection
      pullSchema={pullSchema.data}
      focusedPath={path}
      operationMethod={operationMethod}
    />
  );
}
