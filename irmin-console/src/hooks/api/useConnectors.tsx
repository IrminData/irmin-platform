import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { connectorsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import type { Connector } from '@/types/core/Connector';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export function useConnectors() {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  // Query for fetching all connections in the current workspace
  const connectorsQuery = useQuery<IrminAPIResponse<Connector[]>>({
    queryKey: connectorsQueryKey,
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const connectors = await core.connectorService.fetchAllConnectors();
      return connectors;
    },
  });

  return {
    // Queries
    connectorsQuery,
  };
}
