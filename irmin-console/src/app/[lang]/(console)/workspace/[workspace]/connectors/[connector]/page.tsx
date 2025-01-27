import { notFound } from 'next/navigation';

import { getConnector } from '@/lib/actions/connectors';
import { Locale } from '@/lib/dict';
import { getToken } from '@/lib/getToken';

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

  const connectorID = params.connector;
  if (isInvalidRouteProp(connectorID)) return notFound();

  const token = await getToken();
  const connector = await getConnector(connectorID, token);

  if (!connector) return notFound();

  return (
    <div className='relative container mx-auto max-w-6xl py-8'>
      <ConnectorSection connector={connector} />
    </div>
  );
}
