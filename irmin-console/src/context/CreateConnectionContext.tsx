import React, { createContext, useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createConnection } from '@/lib/actions/connections';
import {
  getConnectorConfigurationFields,
  validateConnectorConfiguration,
} from '@/lib/actions/connectors';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import { Connector } from '@/types/core/Connector';
import {
  ConnectionSetup,
  SelectConnectorFormValues,
} from '@/types/internal/ConnectionSetup';
import { DynamicFieldValues } from '@/types/internal/DynamicField';

/**
 * Initial connection data state.
 */
export const initialConnectionData: ConnectionSetup = {
  name: '',
  description: '',
  connector: undefined,
  connectionDetailsFields: undefined,
  connectionSettingsFields: undefined,
  connectionDetails: undefined,
  connectionSettings: undefined,
};

/**
 * Interface for the create connection context value.
 */
interface CreateConnectionContextValue {
  // Category filter
  filteredConnectors: Connector[];
  activeCategory: string;
  categoryFilterOptions: string[];
  selectCategoryFilter: (category: string) => void;
  // Connection process state
  connectionData: ConnectionSetup;
  currentStep: number;
  goBack: () => void;
  closeModal: () => void;
  resetCreateConnection: () => void;
  // Functions to progress through the steps
  handleConnectorClick: (connector: Connector) => void;
  handleConnectorSelected: (data: SelectConnectorFormValues) => void;
  fetchConnectionDetails: (connectorId: string) => Promise<void>;
  continueAndTestConnection: (data: DynamicFieldValues) => Promise<void>;
  fetchConnectionSettings: () => Promise<void>;
  continueCreateConnection: (data: DynamicFieldValues) => Promise<void>;
  createConnection: (data: DynamicFieldValues) => Promise<void>;
  // Loading state for different tasks
  loading: {
    fetchDetails: boolean;
    testConnection: boolean;
    fetchSettings: boolean;
    continueCreate: boolean;
    create: boolean;
  };
}

// Create context with an undefined default value.
const CreateConnectionContext = createContext<
  CreateConnectionContextValue | undefined
>(undefined);

/**
 * Provider component for the create connection context.
 *
 * Props:
 * - connectors: Array of available connectors.
 * - closeModal: Callback function to close the modal on successful creation.
 * - children: Child components to render.
 */
export const CreateConnectionProvider: React.FC<{
  connectors: Connector[];
  closeModal: () => void;
  children: React.ReactNode;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}> = ({ connectors, closeModal, children, currentStep, setCurrentStep }) => {
  const { dict } = useLocale(); // Get translated strings
  const { irminAlert } = usePopup(); // Get alert functionality
  const { workspaceSlug } = useWorkspace(); // Get workspace information

  // State to hold connection data
  const [connectionData, setConnectionData] = useState<ConnectionSetup>(
    initialConnectionData
  );

  // Loading states for different asynchronous tasks
  const [loading, setLoading] = useState({
    fetchDetails: false,
    testConnection: false,
    fetchSettings: false,
    continueCreate: false,
    create: false,
  });

  // Function to go back to the previous step
  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, setCurrentStep]);

  // Sort the connectors alphabetically.
  const [filteredConnectors, setFilteredConnectors] = useState<Connector[]>(
    connectors.sort((a, b) => a.name.localeCompare(b.name))
  );
  const [activeCategory, setActiveCategory] = useState<string>(
    dict.connections.create.categoryAll
  );
  const categoryFilterOptions = [
    dict.connections.create.categoryAll,
    ...new Set(connectors.map((connector) => connector.primary_category)),
  ];

  /**
   * Filter connectors by category.
   *
   * @param category - The category used to filter connectors.
   */
  const selectCategoryFilter = useCallback(
    (category: string) => {
      setActiveCategory(category);
      setFilteredConnectors(
        category === dict.connections.create.categoryAll
          ? connectors
          : connectors.filter(
              (connector) => connector.primary_category === category
            )
      );
    },
    [connectors, dict.connections.create.categoryAll]
  );

  /**
   * Handle the clicking of a connector.
   *
   * @param connector - The connector selected by the user.
   */
  const handleConnectorClick = useCallback((connector: Connector) => {
    setConnectionData((prev) => ({
      ...prev,
      connector,
    }));
  }, []);

  /**
   * Handle submission of the connector selection form.
   *
   * @param data - Form values that include the selected connector.
   */
  const handleConnectorSelected = useCallback(
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
    [setCurrentStep, irminAlert, dict.connections.create.pleaseSelectConnector]
  );

  const detailsFetched = useRef(false);
  /**
   * Fetch configuration fields for connection details.
   *
   * @param connectorId - The ID of the selected connector.
   */
  const fetchConnectionDetails = useCallback(
    async (connectorId: string) => {
      setLoading((prev) => ({ ...prev, fetchDetails: true }));
      detailsFetched.current = true;
      try {
        const res = await getConnectorConfigurationFields({
          connectorId,
          configurationType: 'details',
        });
        setConnectionData((prev) => ({
          ...prev,
          connectionDetailsFields: res.data,
        }));
      } catch (error) {
        console.error('Fetch connection details error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch connection details'
        );
      }
      setLoading((prev) => ({ ...prev, fetchDetails: false }));
    },
    [irminAlert]
  );

  useEffect(() => {
    if (connectionData.connector?.id && !detailsFetched.current) {
      fetchConnectionDetails(connectionData.connector.id);
    }
  }, [connectionData.connector?.id, fetchConnectionDetails]);

  /**
   * Continue to test the connection configuration.
   *
   * @param data - Dynamic fields containing connection details.
   */
  const continueAndTestConnection = useCallback(
    async (data: DynamicFieldValues) => {
      setLoading((prev) => ({ ...prev, testConnection: true }));
      try {
        // Destructure to separate the connection name from details.
        const { irmin_connection_name, ...connectionDetails } = data;
        const newName =
          (irmin_connection_name as string) ||
          `${connectionData.connector?.name} ${Date.now()}`;
        // Create an updated connection data object.
        const updatedData = {
          ...connectionData,
          name: newName,
          connectionDetails: connectionDetails as DynamicFieldValues,
        };
        setConnectionData(updatedData);
        // Validate the configuration with the connection details.
        const res = await validateConnectorConfiguration({
          connectorId: connectionData.connector?.id ?? '',
          details: connectionDetails,
        });
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
        setLoading((prev) => ({ ...prev, testConnection: false }));
      }
    },
    [connectionData, irminAlert, dict, setCurrentStep]
  );

  const settingsFetched = useRef(false);
  /**
   * Fetch configuration fields for connection settings.
   *
   * Uses current connection details to determine available settings.
   */
  const fetchConnectionSettings = useCallback(async () => {
    if (!connectionData.connector?.id || !connectionData.connectionDetails)
      return;
    setLoading((prev) => ({ ...prev, fetchSettings: true }));
    settingsFetched.current = true;
    try {
      const res = await getConnectorConfigurationFields({
        connectorId: connectionData.connector.id,
        configurationType: 'settings',
        currentDetails: connectionData.connectionDetails,
      });
      setConnectionData((prev) => ({
        ...prev,
        connectionSettingsFields: res.data,
      }));
    } catch (error) {
      console.error('Fetch connection settings error:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch connection settings'
      );
    }
    setLoading((prev) => ({ ...prev, fetchSettings: false }));
  }, [connectionData.connector, connectionData.connectionDetails, irminAlert]);

  useEffect(() => {
    if (
      connectionData.connector?.id &&
      connectionData.connectionDetails &&
      !settingsFetched.current
    ) {
      fetchConnectionSettings();
    }
  }, [
    connectionData.connector?.id,
    connectionData.connectionDetails,
    fetchConnectionSettings,
  ]);

  /**
   * Continue with connection setup after fetching the settings.
   *
   * @param data - Dynamic fields containing connection settings.
   */
  const continueCreateConnection = useCallback(
    async (data: DynamicFieldValues) => {
      setLoading((prev) => ({ ...prev, continueCreate: true }));
      try {
        // Update connection data with settings
        setConnectionData((prev) => ({
          ...prev,
          connectionSettings: data,
        }));
        // Validate the configuration with both details and settings.
        const res = await validateConnectorConfiguration({
          connectorId: connectionData.connector?.id ?? '',
          details: connectionData.connectionDetails,
          settings: data,
        });
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
        setLoading((prev) => ({ ...prev, continueCreate: false }));
      }
    },
    [connectionData, dict, irminAlert, setCurrentStep]
  );

  /**
   * Finalise and create the connection.
   *
   * @param data - Dynamic fields containing description and documentation.
   */
  const createConnectionHandler = useCallback(
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
      setLoading((prev) => ({ ...prev, create: true }));
      try {
        const res = await createConnection({
          workspace: workspaceSlug,
          name: connectionData.name,
          description: data.description as string,
          documentation: (data.documentation as string) ?? '',
          connectorID: connectionData.connector.id,
          connectionDetails: connectionData.connectionDetails,
          connectionSettings: connectionData.connectionSettings,
        });
        irminAlert('success', res.message ?? 'Connection created successfully');
        closeModal();
      } catch (error) {
        console.error('Failed to create connection:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create connection'
        );
      } finally {
        setLoading((prev) => ({ ...prev, create: false }));
      }
    },
    [workspaceSlug, connectionData, irminAlert, dict, closeModal]
  );

  /**
   * Reset connection creation state by setting connection data and the current step.
   */
  const resetCreateConnection = useCallback(() => {
    setConnectionData(initialConnectionData);
    setCurrentStep(1);
  }, [setCurrentStep]);

  return (
    <CreateConnectionContext.Provider
      value={{
        // Category filter
        filteredConnectors,
        activeCategory,
        categoryFilterOptions,
        selectCategoryFilter,
        // Connection process state
        connectionData,
        currentStep,
        goBack,
        closeModal,
        resetCreateConnection,
        // Functions to progress through steps
        handleConnectorClick,
        handleConnectorSelected,
        fetchConnectionDetails,
        continueAndTestConnection,
        fetchConnectionSettings,
        continueCreateConnection,
        createConnection: createConnectionHandler,
        // Loading states for UI feedback
        loading,
      }}
    >
      {children}
    </CreateConnectionContext.Provider>
  );
};

/**
 * Hook to access the create connection context.
 */
export const useCreateConnection = (): CreateConnectionContextValue => {
  const context = useContext(CreateConnectionContext);
  if (!context) {
    throw new Error(
      'useCreateConnection must be used within a CreateConnectionProvider'
    );
  }
  return context;
};
