import { DynamicFieldValues } from './DynamicField';

/**
 * Export setup object
 */
export interface ExportSetup {
  /** Connection ID */
  connectionID: null | number;
  /** Export name */
  name: string;
  /** Export settings */
  settings: DynamicFieldValues;
  /** Interval at which the export should run */
  cron: string;
}
