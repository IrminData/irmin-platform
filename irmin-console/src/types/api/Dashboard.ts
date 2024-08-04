import { Widget } from '@/types/api/Widget';

/**
 * Dashboard type
 *
 * @see {@link https://github.com/IrminData/irmin-frontend/blob/development/src/types/examples/apiObjects.ts | examples/apiObjects.ts} - find object referencing this type to view example
 *
 * @typeParam id - Dashboard ID
 * @typeParam name - Dashboard name
 * @typeParam widgets - Array of Widgets to show on the dashboard, in order
 * @typeParam created_at - Dashboard creation date
 * @typeParam updated_at - Dashboard update date
 */
export interface Dashboard {
  id: number;
  name: string;
  widgets: Widget[];
  created_at: string;
  updated_at: string;
}
