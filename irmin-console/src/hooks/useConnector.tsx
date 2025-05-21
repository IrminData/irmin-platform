import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import { Connector } from '@/types/core/Connector';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export const connectorQueryKey = (connectorID: string) =>
  ['connector', connectorID] as const;

export function useConnector(connectorID: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  // Query for fetching all connections in the current workspace
  const connectorQuery = useQuery<IrminAPIResponse<Connector>>({
    queryKey: connectorQueryKey(connectorID),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const connector = await core.connectorService.fetchConnector({
        connectorId: connectorID,
      });
      return connector;
    },
    enabled: !!connectorID,
  });

  return {
    // Queries
    connectorQuery,
  };
}
