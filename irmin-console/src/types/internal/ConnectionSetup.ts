import { Connector } from '@/types/api/Connector';

import { DynamicFields, DynamicFieldValues } from './DynamicField';

/**
 * Connection setup object
 * @typeParam name - Connection name
 * @typeParam cron - Connection cron, interval at which the connection should sync
 * @typeParam description - Connection description
 * @typeParam connector - Which connector to use
 * @typeParam connectionDetailsFields - Connection details fields
 * @typeParam connectionSettingsFields - Connection settings fields
 * @typeParam connectionDetails - Connection details with user input
 * @typeParam connectionSettings - Connection settings with user input
 */
export interface ConnectionSetup {
  name: string;
  cron: string;
  description: string;
  connector: null | Connector;
  connectionDetailsFields: null | DynamicFields;
  connectionSettingsFields: null | DynamicFields;
  connectionDetails: null | DynamicFieldValues;
  connectionSettings: null | DynamicFieldValues;
}
