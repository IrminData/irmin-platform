import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import { Connector } from '@/types/core/Connector';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export const connectorsQueryKey = ['connectors'] as const;

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
