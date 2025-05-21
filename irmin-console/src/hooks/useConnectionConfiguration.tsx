import { useMutation, useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import { ConnectorConfigurationValidationResult } from '@/types/core/Connector';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

export const connectorConfigurationQueryKey = (
  type: 'details' | 'settings',
  connectorID?: string,
  details?: DynamicFieldValues,
  settings?: DynamicFieldValues
) => ['connector', connectorID, type, details, settings] as const;

type ValidateConnectorConfigurationInput = {
  details?: DynamicFieldValues;
  settings?: DynamicFieldValues;
};

export function useConnectionConfiguration(
  type: 'details' | 'settings',
  connectorID?: string,
  details?: DynamicFieldValues,
  settings?: DynamicFieldValues
) {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  // Query for fetching configuration fields for a connection
  const connectionConfigurationQuery = useQuery<
    IrminAPIResponse<DynamicFields>
  >({
    queryKey: connectorConfigurationQueryKey(
      type,
      connectorID,
      details,
      settings
    ),
    queryFn: async () => {
      if (!connectorID) throw new Error('Connector ID is required');
      if (!type) throw new Error('Type is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.connectorService.fetchConnectorConfigurationFields(
        {
          connectorId: connectorID,
          configurationType: type,
          currentDetails: details,
          currentSettings: settings,
        }
      );
      return res;
    },
    enabled: !!connectorID && !!type,
  });

  // Mutation for validating a connector configuration
  const validateConnectorConfigurationMutation = useMutation<
    IrminAPIResponse<ConnectorConfigurationValidationResult>,
    Error,
    ValidateConnectorConfigurationInput
  >({
    mutationFn: async (input: ValidateConnectorConfigurationInput) => {
      if (!connectorID) throw new Error('Connector ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.connectorService.validateConnectorConfiguration({
        connectorId: connectorID,
        details: input.details,
        settings: input.settings,
      });
      return res;
    },
  });

  return {
    // Queries
    connectionConfigurationQuery,

    // Mutations
    validateConnectorConfigurationMutation,
  };
}
