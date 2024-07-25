import { Widget } from './Widget';

/**
 * Dashboard type
 * @typeParam id - Dashboard ID
 * @typeParam name - Dashboard name
 * @typeParam widgets - Array of Widgets to show on the dashboard, in order
 * @typeParam created_at - Dashboard creation date
 * @typeParam updated_at - Dashboard update date
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface Dashboard {
  id: number;
  name: string;
  widgets: Widget[];
  created_at: string;
  updated_at: string;
}
