import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { connectorConfigurationQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { usePopup } from '@/context/PopupContext';

import type { ConnectionFieldValues } from '@/types/core/Connection';
import type { ConnectorConfigurationValidationResult } from '@/types/core/Connector';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { DynamicFields } from '@/types/internal/DynamicField';

interface ValidateConnectorConfigurationInput {
  details?: ConnectionFieldValues;
  settings?: ConnectionFieldValues;
}

export function useConnectionConfiguration(
  type: 'details' | 'settings',
  connectorID?: string,
  details?: ConnectionFieldValues,
  settings?: ConnectionFieldValues
) {
  const { getCore } = useIrminCore();
  const queryClient = useQueryClient();
  const { irminAlert } = usePopup();

  const connectionConfigurationQuery = useQuery<
    IrminAPIResponse<DynamicFields>,
    Error
  >({
    queryKey: connectorConfigurationQueryKey(
      type,
      connectorID,
      details,
      settings
    ),
    queryFn: async () => {
      const core = await getCore();
      return await core.connectorService.fetchConnectorConfigurationFields({
        connectorId: connectorID ?? '',
        configurationType: type,
        currentDetails: details,
        currentSettings: settings,
      });
    },
    enabled: !!connectorID,
  });

  // Mutation for validating a connector configuration
  const validateConnectorConfigurationMutation = useMutation<
    IrminAPIResponse<ConnectorConfigurationValidationResult>,
    Error,
    ValidateConnectorConfigurationInput
  >({
    mutationFn: async (input: ValidateConnectorConfigurationInput) => {
      if (!connectorID) throw new Error('Connector ID is required');
      const core = await getCore();
      return await core.connectorService.validateConnectorConfiguration({
        connectorId: connectorID,
        details: input.details,
        settings: input.settings,
      });
    },
    onMutate: async () => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: connectorConfigurationQueryKey(type, connectorID),
      });
    },
    onSuccess: (res) => {
      if (res.data?.ok) {
        irminAlert(
          'success',
          res.message ?? 'Configuration validated successfully'
        );
      } else {
        // Handle validation errors
        const errorMessage =
          res.data?.errors?.join(', ') ?? 'Configuration validation failed';
        irminAlert('error', errorMessage);
      }
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? 'Error validating connector configuration'
      );
    },
    onSettled: () => {
      // Always refetch after validation to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: connectorConfigurationQueryKey(type, connectorID),
      });
    },
  });

  return {
    // Queries
    connectionConfigurationQuery,

    // Mutations
    validateConnectorConfigurationMutation,
  };
}
