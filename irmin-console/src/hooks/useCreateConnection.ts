import { useCallback, useEffect, useRef, useState } from 'react';

import { type UseFormSetValue } from 'react-hook-form';

import { createConnection } from '@/lib/actions/connections';
import {
  getConnectorConfigurationFields,
  validateConnectorConfiguration,
} from '@/lib/actions/connectors';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Connector } from '@/types/core/Connector';
import {
  ConnectionSetup,
  SelectConnectorFormValues,
} from '@/types/internal/ConnectionSetup';
import { DynamicFieldValues } from '@/types/internal/DynamicField';

export const initialConnectionData: ConnectionSetup = {
  name: '',
  description: '',
  connector: undefined,
  connectionDetailsFields: undefined,
  connectionSettingsFields: undefined,
  connectionDetails: undefined,
  connectionSettings: undefined,
};

export function useConnectorCategoryFilter(connectors: Connector[]) {
  const { dict } = useLocale();
  const [filteredConnectors, setFilteredConnectors] = useState<Connector[]>(
    connectors.sort((a, b) => a.name.localeCompare(b.name))
  );
  const [activeCategory, setActiveCategory] = useState<string>(
    dict.connections.create.categoryAll
  );

  const selectCategoryFilter = (category: string) => {
    setActiveCategory(category);
    setFilteredConnectors(
      category === dict.connections.create.categoryAll
        ? connectors
        : connectors.filter(
            (connector) => connector.primary_category === category
          )
    );
  };

  const categoryFilterOptions = [
    dict.connections.create.categoryAll,
    ...new Set(connectors.map((connector) => connector.primary_category)),
  ];

  return {
    filteredConnectors,
    activeCategory,
    categoryFilterOptions,
    selectCategoryFilter,
  };
}

export function useHandleConnectorClick(
  setValue: UseFormSetValue<SelectConnectorFormValues>
) {
  return useCallback(
    (connector: Connector) => {
      setValue('connector', connector, { shouldDirty: true });
    },
    [setValue]
  );
}

export function useHandleConnectorSelected(
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>,
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  return useCallback(
    (data: SelectConnectorFormValues) => {
      if (!data.connector) {
        irminAlert('error', dict.connections.create.pleaseSelectConnector);
        return;
      }
      setConnectionData((prev) => ({
        ...prev,
        connector: data.connector ?? undefined,
      }));
      setCurrentStep(2);
    },
    [
      dict.connections.create.pleaseSelectConnector,
      irminAlert,
      setConnectionData,
      setCurrentStep,
    ]
  );
}

export function useFetchConnectionDetails(
  connectionData: ConnectionSetup,
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>
) {
  const { irminAlert } = usePopup();
  const [loading, setLoading] = useState(false);
  const fetchedFields = useRef(false);

  const fetchConnectionDetails = useCallback(
    async (connectorID: string) => {
      setLoading(true);
      fetchedFields.current = true;
      try {
        const res = await getConnectorConfigurationFields(
          connectorID,
          'details'
        );
        setConnectionData((prev) => ({
          ...prev,
          connectionDetailsFields: res,
        }));
      } catch (error) {
        console.error('Fetch connection details error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch connection details'
        );
      }
      setLoading(false);
    },
    [setConnectionData, irminAlert]
  );

  useEffect(() => {
    const connectorID = connectionData.connector?.id;
    if (!connectorID) return;
    if (!fetchedFields.current) fetchConnectionDetails(connectorID);
  }, [connectionData.connector?.id, fetchConnectionDetails]);

  return { loading, fetchConnectionDetails };
}

export function useContinueAndTestConnection(
  connectionData: ConnectionSetup,
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>,
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
) {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const [loading, setLoading] = useState(false);

  const continueAndTestConnection = useCallback(
    async (data: DynamicFieldValues) => {
      setLoading(true);
      try {
        const { irmin_connection_name, ...connectionDetails } = data;

        setConnectionData({
          ...connectionData,
          name:
            (irmin_connection_name as string) ??
            `${connectionData.connector?.name} ${Date.now()}`,
          connectionDetails: connectionDetails as DynamicFieldValues,
        });

        const res = await validateConnectorConfiguration(
          connectionData.connector?.id ?? '',
          connectionDetails as DynamicFieldValues
        );
        if (res.data?.can_connect && res.data.connection_details_valid) {
          irminAlert('success', dict.connections.create.success);
          setCurrentStep(3);
        } else {
          irminAlert('error', dict.connections.create.failed);
        }
      } catch (error) {
        console.error('Test connection error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to test connection'
        );
      } finally {
        setLoading(false);
      }
    },
    [connectionData, setConnectionData, setCurrentStep, irminAlert, dict]
  );

  return { loading, continueAndTestConnection };
}

export function useFetchConnectionSettings(
  connectionData: ConnectionSetup,
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>
) {
  const { irminAlert } = usePopup();
  const [loading, setLoading] = useState(false);
  const fetchedFields = useRef(false);

  const fetchConnectionSettings = useCallback(
    async (connectorID: string, connectionDetails: DynamicFieldValues) => {
      setLoading(true);
      fetchedFields.current = true;
      try {
        const res = await getConnectorConfigurationFields(
          connectorID,
          'settings',
          connectionDetails
        );
        setConnectionData((prev) => ({
          ...prev,
          connectionSettingsFields: res,
        }));
      } catch (error) {
        console.error('Fetch new connection settings error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch new connection settings'
        );
      }
      setLoading(false);
    },
    [setConnectionData, irminAlert]
  );

  useEffect(() => {
    const connectorID = connectionData.connector?.id;
    const connectionDetails = connectionData.connectionDetails;
    if (!connectorID || !connectionDetails) return;
    if (!fetchedFields.current)
      fetchConnectionSettings(connectorID, connectionDetails);
  }, [connectionData, fetchConnectionSettings]);

  return { loading, fetchConnectionSettings };
}

export function useContinueCreateConnection(
  connectionData: ConnectionSetup,
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>,
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const [loading, setLoading] = useState(false);

  const continueCreateConnection = useCallback(
    async (data: DynamicFieldValues) => {
      setLoading(true);
      try {
        setConnectionData({
          ...connectionData,
          connectionSettings: data,
        });
        const res = await validateConnectorConfiguration(
          connectionData.connector?.id ?? '',
          connectionData.connectionDetails,
          data
        );
        if (res.data?.ok && res.data.connection_settings_valid) {
          irminAlert('success', dict.connections.create.configuration_valid);
          setCurrentStep(4);
        } else {
          irminAlert('error', dict.connections.create.configuration_invalid);
        }
      } catch (error) {
        console.error('Failed to set connection settings:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to set connection settings'
        );
      } finally {
        setLoading(false);
      }
    },
    [connectionData, dict, setConnectionData, setCurrentStep, irminAlert]
  );

  return { loading, continueCreateConnection };
}

export function useCreateConnection(
  connectionData: ConnectionSetup,
  closeModal: () => void
) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const handleCreateConnection = useCallback(
    async (data: DynamicFieldValues) => {
      if (
        !connectionData.name ||
        !data.description ||
        !connectionData.connector ||
        !connectionData.connectionDetails ||
        !connectionData.connectionSettings
      ) {
        irminAlert('error', dict.connections.create.requiredFieldsMissing);
        return;
      }

      try {
        const res = await createConnection({
          connectorID: connectionData.connector.id,
          connectionDetails: connectionData.connectionDetails,
          connectionSettings: connectionData.connectionSettings,
          name: connectionData.name,
          description: data.description as string,
        });

        irminAlert('success', res.message ?? 'Connection created successfully');
        closeModal();
      } catch (error) {
        console.error('Failed to create connection', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create connection'
        );
      }
    },
    [
      connectionData,
      irminAlert,
      dict.connections.create.requiredFieldsMissing,
      closeModal,
    ]
  );

  return { createConnection: handleCreateConnection };
}
