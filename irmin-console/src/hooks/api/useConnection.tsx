import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { connectionQueryKey, connectionsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Connection } from '@/types/core/Connection';
import type { ConnectorConfigurationValidationResult } from '@/types/core/Connector';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import {
  deleteMutationHandlers,
  updateMutationHandlers,
} from './mutations/utils';

type UpdateConnectionInput = Pick<
  Connection,
  'description' | 'documentation' | 'name'
>;

type UpdateConnectionConfigurationInput = Pick<
  Connection,
  'details' | 'settings'
>;

export function useConnection(connectionID: string) {
  const { getCore } = useIrminCore();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const { irminAlert, irminConfirm } = usePopup();

  // Query for fetching a single connection by ID
  const connectionQuery = useQuery<IrminAPIResponse<Connection>>({
    queryKey: connectionQueryKey(workspaceSlug, connectionID),
    queryFn: async () => {
      const core = await getCore();
      const connection = await core.connectionService.fetchConnection({
        workspace: workspaceSlug,
        connectionID,
      });
      return connection;
    },
    initialData: () => {
      const connections = queryClient.getQueryData<
        IrminAPIResponse<Connection[]>
      >(connectionsQueryKey(workspaceSlug));
      return connections?.data?.find((c: Connection) => c.id === connectionID)
        ? {
            data: connections.data.find(
              (c: Connection) => c.id === connectionID
            ),
            success: true,
            message: 'Cached data',
          }
        : undefined;
    },
    enabled: !!connectionID,
  });

  // Mutation for deleting a connection
  const deleteConnectionMutation = useMutation<IrminAPIResponse, Error, string>(
    {
      mutationFn: async (connId: string) => {
        const core = await getCore();
        const res = await core.connectionService.deleteConnection({
          workspace: workspaceSlug,
          connectionID: connId,
        });
        return res;
      },
      ...deleteMutationHandlers<Connection>(queryClient, {
        cacheConfig: {
          primaryQueryKey: connectionsQueryKey(workspaceSlug),
          getItemId: (connection) => connection.id,
        },
        singleItemQueryKey: connectionQueryKey(
          workspaceSlug,
          connectionID || ''
        ),
        onSuccess: (res) => {
          irminAlert(
            'success',
            res.message ?? 'Connection deleted successfully'
          );
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Error deleting the connection');
        },
      }),
    }
  );

  // Handler for deleting a connection
  const { mutate: deleteConnection } = deleteConnectionMutation;
  const handleDeleteConnection = useCallback(async () => {
    if (!connectionID) return;
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${connectionQuery.data?.data?.name})`
    );
    if (confirmed) {
      deleteConnection(connectionID);
    }
  }, [
    dict,
    irminConfirm,
    connectionQuery.data?.data,
    deleteConnection,
    connectionID,
  ]);

  // Mutation for updating a connection
  const updateConnectionMutation = useMutation<
    IrminAPIResponse<Connection>,
    Error,
    UpdateConnectionInput
  >({
    mutationFn: async (input: UpdateConnectionInput) => {
      if (!connectionID) throw new Error('Connection ID is required');
      const core = await getCore();
      const res = await core.connectionService.updateConnection({
        workspace: workspaceSlug,
        connectionID,
        name: input.name,
        description: input.description,
        documentation: input.documentation,
      });
      return res;
    },
    ...updateMutationHandlers<Connection, UpdateConnectionInput>(queryClient, {
      cacheConfig: {
        primaryQueryKey: connectionsQueryKey(workspaceSlug),
        getItemId: (connection) => connection.id,
      },
      singleItemQueryKey: connectionQueryKey(workspaceSlug, connectionID || ''),
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Connection updated successfully');
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Error updating the connection');
      },
    }),
  });

  // Mutation for updating a connection configuration
  const updateConnectionConfigurationMutation = useMutation({
    mutationFn: async (input: UpdateConnectionConfigurationInput) => {
      if (!connectionID) throw new Error('Connection ID is required');
      const core = await getCore();
      const res = await core.connectionService.updateConnectionConfiguration({
        workspace: workspaceSlug,
        connectionID,
        details: input.details,
        settings: input.settings,
      });
      return res;
    },
    onMutate: async (input: UpdateConnectionConfigurationInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
      await queryClient.cancelQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });

      // Snapshot the previous values
      const previousConnection = queryClient.getQueryData<
        IrminAPIResponse<Connection>
      >(connectionQueryKey(workspaceSlug, connectionID));
      const previousConnections = queryClient.getQueryData<
        IrminAPIResponse<Connection[]>
      >(connectionsQueryKey(workspaceSlug));

      // Optimistically update the single connection cache
      queryClient.setQueryData<IrminAPIResponse<Connection>>(
        connectionQueryKey(workspaceSlug, connectionID),
        (old: IrminAPIResponse<Connection> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: {
              ...old.data,
              ...input,
            },
          };
        }
      );

      // Optimistically update the connections list cache
      queryClient.setQueryData<IrminAPIResponse<Connection[]>>(
        connectionsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Connection[]> | undefined) => {
          if (!old?.data) return old;

          const updatedConnections = old.data.map((connection: Connection) =>
            connection.id === connectionID
              ? { ...connection, ...input }
              : connection
          );

          return {
            ...old,
            data: updatedConnections,
          };
        }
      );

      // Return context for rollback
      return { previousConnection, previousConnections };
    },
    onError: (
      error,
      input: UpdateConnectionConfigurationInput,
      context?: {
        previousConnection?: IrminAPIResponse<Connection>;
        previousConnections?: IrminAPIResponse<Connection[]>;
      }
    ) => {
      // Rollback on error
      if (context?.previousConnection) {
        queryClient.setQueryData(
          connectionQueryKey(workspaceSlug, connectionID),
          context.previousConnection
        );
      }
      if (context?.previousConnections) {
        queryClient.setQueryData(
          connectionsQueryKey(workspaceSlug),
          context.previousConnections
        );
      }
      irminAlert('error', error.message ?? 'Error updating the connection');
    },
    onSuccess: (
      res: IrminAPIResponse<Connection>,
      _input: UpdateConnectionConfigurationInput
    ) => {
      // Update the cache with the real data from the server
      if (res.data) {
        queryClient.setQueryData<IrminAPIResponse<Connection>>(
          connectionQueryKey(workspaceSlug, connectionID),
          res
        );

        // Update the connections list
        queryClient.setQueryData<IrminAPIResponse<Connection[]>>(
          connectionsQueryKey(workspaceSlug),
          (old: IrminAPIResponse<Connection[]> | undefined) => {
            if (!old?.data) return old;

            const updatedConnections = old.data.map((connection: Connection) =>
              connection.id === connectionID ? res.data! : connection
            );

            return {
              ...old,
              data: updatedConnections,
            };
          }
        );
      }

      irminAlert('success', res.message ?? 'Connection updated successfully');
    },
  });

  // Mutation for transferring a connection
  const transferConnectionMutation = useMutation({
    mutationFn: async (newOwner: string) => {
      if (!connectionID) throw new Error('Connection ID is required');
      const core = await getCore();
      const res = await core.connectionService.transferConnection({
        workspace: workspaceSlug,
        connectionID,
        newOwner,
      });
      return res;
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
      void queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });
      irminAlert(
        'success',
        res.message ?? 'Connection transferred successfully'
      );
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error transferring the connection');
    },
  });

  // Mutation for testing a connection
  const testConnectionMutation = useMutation<
    IrminAPIResponse<ConnectorConfigurationValidationResult>,
    Error
  >({
    mutationFn: async () => {
      if (!connectionID) throw new Error('Connection ID is required');
      const core = await getCore();
      return await core.connectionService.testConnection({
        workspace: workspaceSlug,
        connectionID,
      });
    },
    onSuccess: (res) => {
      if (res.data?.ok) {
        irminAlert('success', res.message ?? 'Connection tested successfully');
      } else {
        const errorMessage =
          res.data?.errors?.join(', ') ?? 'Connection test failed';
        irminAlert('error', errorMessage);
      }
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error testing connection');
    },
  });

  return {
    // Queries
    connectionQuery,

    // Mutations
    deleteConnectionMutation,
    updateConnectionMutation,
    updateConnectionConfigurationMutation,
    transferConnectionMutation,
    testConnectionMutation,

    // Handlers
    handleDeleteConnection,
  };
}
