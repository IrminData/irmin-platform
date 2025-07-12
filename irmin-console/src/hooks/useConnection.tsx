import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { Connection } from '@/types/core/Connection';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { connectionsQueryKey } from './useConnections';

export const connectionQueryKey = (
  workspaceSlug: string,
  connectionID: string
) => ['connection', workspaceSlug, connectionID] as const;

type UpdateConnectionInput = Pick<
  Connection,
  'name' | 'description' | 'documentation'
>;

type UpdateConnectionConfigurationInput = Pick<
  Connection,
  'details' | 'settings'
>;

export function useConnection(connectionID: string) {
  const { getToken } = useIAM();
  const { locale, dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const { irminAlert, irminConfirm } = usePopup();

  // Query for fetching a single connection by ID
  const connectionQuery = useQuery<IrminAPIResponse<Connection>>({
    queryKey: connectionQueryKey(workspaceSlug, connectionID),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const connection = await core.connectionService.fetchConnection({
        workspace: workspaceSlug,
        connectionID,
      });
      return connection;
    },
    enabled: !!connectionID,
  });

  // Mutation for deleting a connection
  const deleteConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!connectionID) throw new Error('Connection ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.connectionService.deleteConnection({
        workspace: workspaceSlug,
        connectionID,
      });
      return res;
    },
    onMutate: async () => {
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

      // Optimistically remove from connections list cache
      queryClient.setQueryData<IrminAPIResponse<Connection[]>>(
        connectionsQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Connection[]> | undefined) => {
          if (!old?.data) return old;

          const filteredConnections = old.data.filter(
            (connection: Connection) => connection.id !== connectionID
          );

          return {
            ...old,
            data: filteredConnections,
          };
        }
      );

      // Clear single connection cache
      queryClient.removeQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });

      // Return context for rollback
      return { previousConnection, previousConnections };
    },
    onError: (
      error,
      variables: void,
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
      irminAlert('error', error.message ?? 'Error deleting the connection');
    },
    onSuccess: (res: IrminAPIResponse) => {
      // The optimistic update is already done, just show success message
      irminAlert('success', res.message ?? 'Connection deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
      queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });
    },
  });

  // Handler for deleting a connection
  const { mutate: deleteConnection } = deleteConnectionMutation;
  const handleDeleteConnection = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${connectionQuery.data?.data?.name})`
    );
    if (confirmed) {
      deleteConnection();
    }
  }, [dict, irminConfirm, connectionQuery.data?.data, deleteConnection]);

  // Mutation for updating a connection
  const updateConnectionMutation = useMutation({
    mutationFn: async (input: UpdateConnectionInput) => {
      if (!connectionID) throw new Error('Connection ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.connectionService.updateConnection({
        workspace: workspaceSlug,
        connectionID,
        name: input.name,
        description: input.description,
        documentation: input.documentation,
      });
      return res;
    },
    onMutate: async (input: UpdateConnectionInput) => {
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
      input: UpdateConnectionInput,
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
      _input: UpdateConnectionInput
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
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
      queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });
    },
  });

  // Mutation for updating a connection configuration
  const updateConnectionConfigurationMutation = useMutation({
    mutationFn: async (input: UpdateConnectionConfigurationInput) => {
      if (!connectionID) throw new Error('Connection ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.connectionService.updateConnection({
        workspace: workspaceSlug,
        connectionID,
        connectionDetails: input.details,
        connectionSettings: input.settings,
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
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
      queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });
    },
  });

  // Mutation for transferring a connection
  const transferConnectionMutation = useMutation({
    mutationFn: async (newOwner: string) => {
      if (!connectionID) throw new Error('Connection ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.connectionService.transferConnection({
        workspace: workspaceSlug,
        connectionID,
        newOwner,
      });
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
      queryClient.invalidateQueries({
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

  return {
    // Queries
    connectionQuery,

    // Mutations
    deleteConnectionMutation,
    updateConnectionMutation,
    updateConnectionConfigurationMutation,
    transferConnectionMutation,

    // Handlers
    handleDeleteConnection,
  };
}
