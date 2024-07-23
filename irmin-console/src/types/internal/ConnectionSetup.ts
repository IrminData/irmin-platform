import {
  ConnectionDetailsAndSettings,
  ConnectionDetailsAndSettingsFields,
  Connector,
} from '@/types/api/Connector';

export interface ConnectionSetup {
  name: string;
  cron: string;
  connector: null | Connector;
  connectionDetailsFields: null | ConnectionDetailsAndSettingsFields;
  connectionSettingsFields: null | ConnectionDetailsAndSettingsFields;
  connectionDetails: null | ConnectionDetailsAndSettings;
  connectionSettings: null | ConnectionDetailsAndSettings;
}
