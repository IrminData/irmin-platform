import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { generateTempId } from '@/utils/generateTempId';

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
    onMutate: async (input: CreateConnectionMutation) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });

      // Snapshot the previous value
      const previousConnections = queryClient.getQueryData<
        IrminAPIResponse<Connection[]>
      >(connectionsQueryKey(workspaceSlug));

      // Create unique temp ID for this specific mutation
      const tempId = generateTempId('connections');

      // Optimistically update the cache
      queryClient.setQueryData<IrminAPIResponse<Connection[]>>(
        connectionsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Connection[]> | undefined) => {
          if (!old?.data) return old;

          // Create optimistic connection object
          const optimisticConnection: Connection = {
            id: tempId, // Unique temporary ID
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
          };

          return {
            ...old,
            data: [...old.data, optimisticConnection],
          };
        }
      );

      // Return context for rollback
      return { previousConnections, tempId };
    },
    onError: (error, input: CreateConnectionMutation, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | {
            previousConnections?: IrminAPIResponse<Connection[]>;
            tempId?: string;
          }
        | undefined;
      if (ctx?.previousConnections) {
        queryClient.setQueryData(
          connectionsQueryKey(workspaceSlug),
          ctx.previousConnections
        );
      }
      console.error(error);
      irminAlert('error', error.message ?? 'Failed to create connection');
    },
    onSuccess: (
      res: IrminAPIResponse<Connection>,
      input: CreateConnectionMutation,
      context: unknown
    ) => {
      // Update the cache with the real data from the server
      const ctx = context as
        | {
            previousConnections?: IrminAPIResponse<Connection[]>;
            tempId?: string;
          }
        | undefined;

      queryClient.setQueryData<IrminAPIResponse<Connection[]>>(
        connectionsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Connection[]> | undefined) => {
          if (!old?.data || !res.data || !ctx?.tempId) return old;

          // Replace the specific optimistic connection with the real one using exact temp ID
          const updatedConnections = old.data.map((connection: Connection) =>
            connection.id === ctx.tempId ? res.data! : connection
          );

          return {
            ...old,
            data: updatedConnections,
          };
        }
      );

      irminAlert('success', res.message ?? 'Connection created successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });
    },
  });

  return {
    // Queries
    connectionsQuery,

    // Mutations
    createConnectionMutation,
  };
}
