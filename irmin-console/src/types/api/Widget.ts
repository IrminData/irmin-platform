import { WidgetData } from '@/types/internal/WidgetData';

/**
 * Types of widgets that can be created
 */
export type WidgetType = 'line' | 'bar' | 'table' | 'metric';

/**
 * Widget type
 *
 * @see `@/src/types/examples/apiObjects.ts` - find object referencing this type to view example
 *
 * @todo
 *
 * The API will not be providing Widget Data directly. Instead, we will store "widget creation query". This widget creation query will be used to fetch the data from the Workspace DB.
 * That resulting data will be converted to the Widget Data format and be shown in the UI.
 *
 * @typeParam id - Widget ID
 * @typeParam dashboard - ID of the dashboard this widget belongs to
 * @typeParam type - Type of widget
 * @typeParam title - Widget title
 * @typeParam data - The widget data
 */
export interface Widget {
  id: number;
  dashboard: number; // ID of the dashboard this widget belongs to
  type: WidgetType;
  title: string;
  data: WidgetData;
}
