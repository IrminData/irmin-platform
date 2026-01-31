import { useQuery, useQueryClient } from '@tanstack/react-query';

import { connectorQueryKey, connectorsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';

import type { Connector } from '@/types/core/Connector';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export function useConnector(connectorID: string) {
  const { getCore } = useIrminCore();
  const queryClient = useQueryClient();

  // Query for fetching all connections in the current workspace
  const connectorQuery = useQuery<IrminAPIResponse<Connector>>({
    queryKey: connectorQueryKey(connectorID),
    queryFn: async () => {
      const core = await getCore();
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
