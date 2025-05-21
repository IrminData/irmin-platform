import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { ObjectSchema } from '@/types/core/ObjectSchema';

export const connectionSchemaQueryKey = (
  workspaceSlug: string,
  connectionID: string,
  operationMethod: string
) => ['connection', workspaceSlug, connectionID, operationMethod] as const;

export function useConnectionSchema(
  connectionID: string,
  operationMethod: string
) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  // Query for fetching a single connection schema by ID and operation method
  const connectionSchemaQuery = useQuery<IrminAPIResponse<ObjectSchema>>({
    queryKey: connectionSchemaQueryKey(
      workspaceSlug,
      connectionID,
      operationMethod
    ),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const connectionSchema =
        await core.connectionService.fetchConnectionSchema({
          workspace: workspaceSlug,
          connectionID,
          operationMethod,
        });
      return connectionSchema;
    },
    enabled: !!connectionID && !!operationMethod,
  });

  return {
    // Queries
    connectionSchemaQuery,
  };
}
