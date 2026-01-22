import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { connectionsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Connection } from '@/types/core/Connection';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { createMutationHandlers } from './mutations/utils';

type CreateConnectionMutation = Pick<
  Connection,
  'description' | 'details' | 'documentation' | 'name' | 'settings'
> & {
  connectorID: string;
  tags?: string[];
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
        tags: input.tags,
      });
      return newConnection;
    },
    ...createMutationHandlers<Connection, CreateConnectionMutation>(
      queryClient,
      'connections',
      {
        cacheConfig: {
          primaryQueryKey: connectionsQueryKey(workspaceSlug),
          getItemId: (connection) => connection.id,
          createOptimisticItem: (
            input: CreateConnectionMutation,
            tempId: string
          ) => ({
            id: tempId,
            name: input.name,
            description: input.description,
            documentation: input.documentation,
            details: input.details,
            settings: input.settings,
            owner: {
              id: 'temp-owner',
              first_name: 'Current',
              last_name: 'User',
              email: '',
              phone: '',
              company: '',
              profile_picture: '',
            },
            connector: {
              id: input.connectorID,
              name: 'Loading...',
              description: '',
              structure_version: '1.0.0',
              version: '1.0.0',
              author: '',
              logo_url: '',
              capabilities: [],
              locales: [],
              categories: [],
              primary_category: 'other',
              author_email: '',
              read_more_url: '',
            },
          }),
        },
        onSuccess: (res) => {
          irminAlert(
            'success',
            res.message ?? 'Connection created successfully'
          );
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Failed to create connection');
        },
      }
    ),
  });

  // Filter connections by capability
  const getConnectionsWithCapability = (
    capability: 'pull' | 'push' | 'apply_patch' | 'patch_event'
  ) => {
    return (
      connectionsQuery.data?.data?.filter((connection) =>
        connection.connector.capabilities.includes(capability)
      ) ?? []
    );
  };

  return {
    // Queries
    connectionsQuery,
    getConnectionsWithCapability,

    // Mutations
    createConnectionMutation,
  };
}
