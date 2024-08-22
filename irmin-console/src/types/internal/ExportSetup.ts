import { DynamicFieldValues } from "./DynamicField";

/**
 * Export setup object
 * @typeParam connectionID - Connection ID
 * @typeParam name - Export name
 * @typeParam settings - Export settings
 * @typeParam cron - Interval at wich the export should run
 */
export interface ExportSetup {
  connectionID: null | number;
  name: string;
  settings: DynamicFieldValues;
  cron: string;
}
