import type { Connector } from '@/types/core/Connector';
import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

/**
 * Connection setup object
 */
export interface ConnectionSetup {
  /** Connection name */
  name: string;
  /** Connection description */
  description: string;
  /** Which connector to use */
  connector: Connector | undefined;
  /** Connection details fields */
  connectionDetailsFields: DynamicFields | undefined;
  /** Connection settings fields */
  connectionSettingsFields: DynamicFields | undefined;
  /** Connection details with user input */
  connectionDetails: DynamicFieldValues | undefined;
  /** Connection settings with user input */
  connectionSettings: DynamicFieldValues | undefined;
}
