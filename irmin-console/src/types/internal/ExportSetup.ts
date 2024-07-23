import { ConnectionDetailsAndSettings } from '@/types/api/Connector';

export interface ExportSetup {
  connectionID: null | number;
  name: string;
  settings: ConnectionDetailsAndSettings;
  cron: string;
}
