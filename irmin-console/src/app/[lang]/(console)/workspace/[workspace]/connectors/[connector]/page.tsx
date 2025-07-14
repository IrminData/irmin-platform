import { notFound } from 'next/navigation';

import type { Locale } from '@/lib/dict';

import ConnectorSection from '@/components/connector/ConnectorSection';

import { isInvalidRouteProp } from '@/utils/isInvalidRouteProp';

/**
 * URL parameters for a single connector
 *
 * @param lang - The language of the user
 * @param workspace - The slug of the current workspace
 * @param connector - The ID of the connector to show
 */
export type SingleConnectorLayoutParams = {
  lang: Locale;
  workspace: string;
  connector: string;
};

/**
 * Page for a single connector
 */
export default async function ConnectorPage(props: {
  params: Promise<SingleConnectorLayoutParams>;
}) {
  const params = await props.params;

  const connectorId = params.connector;
  if (isInvalidRouteProp(connectorId)) return notFound();

  return (
    <div className='relative container mx-auto max-w-7xl py-8'>
      <ConnectorSection connectorID={connectorId} />
    </div>
  );
}
