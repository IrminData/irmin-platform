import { useQuery } from '@tanstack/react-query';

import { connectorsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';

import type { Connector } from '@/types/core/Connector';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export function useConnectors() {
  const { getCore } = useIrminCore();

  // Query for fetching all connections in the current workspace
  const connectorsQuery = useQuery<IrminAPIResponse<Connector[]>>({
    queryKey: connectorsQueryKey,
    queryFn: async () => {
      const core = await getCore();
      const connectors = await core.connectorService.fetchAllConnectors();
      return connectors;
    },
  });

  return {
    // Queries
    connectorsQuery,
  };
}
