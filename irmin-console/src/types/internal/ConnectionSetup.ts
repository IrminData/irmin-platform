import { Connector } from '@/types/core/Connector';
import {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

export interface SelectConnectorFormValues {
  connector: Connector | null;
}

/**
 * Connection setup object
 * @typeParam name - Connection name
 * @typeParam description - Connection description
 * @typeParam connector - Which connector to use
 * @typeParam connectionDetailsFields - Connection details fields
 * @typeParam connectionSettingsFields - Connection settings fields
 * @typeParam connectionDetails - Connection details with user input
 * @typeParam connectionSettings - Connection settings with user input
 */
export interface ConnectionSetup {
  name: string;
  description: string;
  connector: undefined | Connector;
  connectionDetailsFields: undefined | DynamicFields;
  connectionSettingsFields: undefined | DynamicFields;
  connectionDetails: undefined | DynamicFieldValues;
  connectionSettings: undefined | DynamicFieldValues;
}
