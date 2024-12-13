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
 */
export interface ConnectionSetup {
  /** Connection name */
  name: string;
  /** Connection description */
  description: string;
  /** Which connector to use */
  connector: undefined | Connector;
  /** Connection details fields */
  connectionDetailsFields: undefined | DynamicFields;
  /** Connection settings fields */
  connectionSettingsFields: undefined | DynamicFields;
  /** Connection details with user input */
  connectionDetails: undefined | DynamicFieldValues;
  /** Connection settings with user input */
  connectionSettings: undefined | DynamicFieldValues;
}
