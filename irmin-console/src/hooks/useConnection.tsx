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
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
      queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Connection deleted successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error deleting the connection');
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
      queryClient.invalidateQueries({
        queryKey: connectionsQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Connection updated successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error updating the connection');
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: connectionQueryKey(workspaceSlug, connectionID),
      });
      irminAlert('success', res.message ?? 'Connection updated successfully');
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error updating the connection');
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
