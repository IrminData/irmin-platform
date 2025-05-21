import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { Connection } from '@/types/core/Connection';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export const connectionsQueryKey = (workspaceSlug: string) =>
  ['connections', workspaceSlug] as const;

type CreateConnectionMutation = Pick<
  Connection,
  'name' | 'description' | 'documentation' | 'details' | 'settings'
> & {
  connectorID: string;
};

export function useConnections() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  // Query for fetching all connections in the current workspace
  const connectionsQuery = useQuery<IrminAPIResponse<Connection[]>>({
    queryKey: connectionsQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const connections = await core.connectionService.fetchConnections({
        workspace: workspaceSlug,
      });
      return connections;
    },
  });

  // Mutation for creating a new connection
  const createConnectionMutation = useMutation<
    IrminAPIResponse<Connection>,
    Error,
    CreateConnectionMutation
  >({
    mutationFn: async (input) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const newConnection = await core.connectionService.createConnection({
        workspace: workspaceSlug,
        connectorID: input.connectorID,
        name: input.name,
        description: input.description,
        documentation: input.documentation,
        connectionDetails: input.details,
        connectionSettings: input.settings,
      });
      return newConnection;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Connection created successfully');
    },
    onError: (error) => {
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to create connection');
    },
  });

  return {
    // Queries
    connectionsQuery,

    // Mutations
    createConnectionMutation,
  };
}
