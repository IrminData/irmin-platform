import { WidgetData } from '@/types/internal/WidgetData';

import { Dashboard } from './Dashboard';

/**
 * Types of widgets that can be created
 */
export type WidgetType = 'line' | 'bar' | 'table' | 'metric';

/**
 * Widget type
 *
 * @todo
 *
 * The API will not be providing Widget Data directly. Instead, we will store "widget creation query". This widget creation query will be used to fetch the data from the Workspace DB.
 * That resulting data will be converted to the Widget Data format and be shown in the UI.
 *
 * @typeParam id - Widget ID
 * @typeParam type - Type of widget
 * @typeParam title - Widget title
 * @typeParam data - The widget data
 * @typeParam created_at - Creation date
 * @typeParam updated_at - Last updated date
 */
export interface Widget {
  id: number;
  type: WidgetType;
  title: string;
  dashboards?: Dashboard[] | null;
  data: WidgetData;
  created_at: string;
  updated_at: string;
}
