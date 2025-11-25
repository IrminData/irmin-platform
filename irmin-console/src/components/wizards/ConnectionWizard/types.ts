import type { ConnectionFieldValues } from '@/types/core/Connection';
import type { Connector } from '@/types/core/Connector';
import type { Tag } from '@/types/core/Tag';
import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

export type ConnectionWizardMode = 'create' | 'edit';

/**
 * Connection wizard data state
 */
export interface ConnectionWizardData {
  name: string;
  description: string;
  connector: Connector | undefined;
  connectionDetailsFields: DynamicFields | undefined;
  connectionSettingsFields: DynamicFields | undefined;
  connectionDetails: DynamicFieldValues | undefined;
  connectionSettings: DynamicFieldValues | undefined;
  tags?: Tag[];
}

export interface ConnectionConfigurationSubmission {
  details: ConnectionFieldValues;
  settings: ConnectionFieldValues;
}
