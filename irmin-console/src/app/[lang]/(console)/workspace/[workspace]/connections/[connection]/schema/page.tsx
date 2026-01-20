import { notFound } from 'next/navigation';

import ConnectionSchemaPageContent from '@/components/connection/ConnectionSchemaPageContent';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

import type { PageSearchParams } from '@/types/internal/PageSearchParams';

import type { SingleConnectionLayoutParams } from '../layout';

type SchemaTab = 'view' | 'validate';

/**
 * Page for the Connection Schema
 */
export default async function ConnectionSchemaPage(props: {
  params: Promise<SingleConnectionLayoutParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await props.params;

  const connectionID = params.connection;
  if (isInvalidRouteProp(connectionID)) return notFound();

  // Get path and operation method from query params
  const searchParams = await props.searchParams;
  const path =
    typeof searchParams.path === 'string' ? searchParams.path : undefined;
  const operationMethod =
    typeof searchParams.method === 'string' &&
    (searchParams.method === 'pull' || searchParams.method === 'push')
      ? searchParams.method
      : 'pull';
  const tab: SchemaTab =
    typeof searchParams.tab === 'string' &&
    (searchParams.tab === 'view' || searchParams.tab === 'validate')
      ? searchParams.tab
      : 'view';

  return (
    <ConnectionSchemaPageContent
      operationMethod={operationMethod}
      focusedPath={path}
      defaultTab={tab}
    />
  );
}
