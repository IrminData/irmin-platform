import { useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { connectorQueryKey, connectorsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import type { Connector } from '@/types/core/Connector';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export function useConnector(connectorID: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const queryClient = useQueryClient();

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
    initialData: () => {
      const connectors =
        queryClient.getQueryData<IrminAPIResponse<Connector[]>>(
          connectorsQueryKey
        );
      return connectors?.data?.find((c: Connector) => c.id === connectorID)
        ? {
            data: connectors.data.find((c: Connector) => c.id === connectorID),
            success: true,
            message: 'Cached data',
          }
        : undefined;
    },
    enabled: !!connectorID,
  });

  return {
    // Queries
    connectorQuery,
  };
}
