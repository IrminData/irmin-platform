import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { connectionSchemaQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { ObjectSchema } from '@/types/core/ObjectSchema';

export function useConnectionSchema(
  connectionID: string,
  operationMethod?: string
) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const connectionSchemaQuery = useQuery<IrminAPIResponse<ObjectSchema>, Error>(
    {
      queryKey: connectionSchemaQueryKey(
        workspaceSlug,
        connectionID,
        operationMethod
      ),
      queryFn: async () => {
        const token = await getToken();
        const core = new IrminCore(locale, token);
        return await core.connectionService.fetchConnectionSchema({
          workspace: workspaceSlug,
          connectionID,
          operationMethod: operationMethod ?? 'pull',
        });
      },
    }
  );

  return {
    connectionSchemaQuery,
  };
}
