/**
 * Types of widgets that can be created
 */
export type WidgetType = 'line' | 'bar' | 'table' | 'metric';

/**
 * Widget type
 * @typeParam id - Widget ID
 * @typeParam dashboard - ID of the dashboard this widget belongs to
 * @typeParam type - Type of widget
 * @typeParam title - Widget title
 * @typeParam data - Widget data
 * @example See `/src/types/examples/apiObjects.ts`.ts - find object referencing this type
 */
export interface Widget {
  id: number;
  dashboard: number; // ID of the dashboard this widget belongs to
  type: WidgetType;
  title: string;
  data: ChartOrTableData | MetricData;
}

/**
 * Data for a chart or table widget
 * @typeParam labels - Labels for the data
 * @typeParam datasets - Data for the chart or table
 * @example See `/src/types/examples/apiObjects.ts`.ts - find object referencing this type
 */
export type ChartOrTableData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
};

/**
 * Data for a metric widget
 * @typeParam currentValue - Current value of the metric
 * @typeParam label - Label for the metric
 * @example See `/src/types/examples/apiObjects.ts`.ts - find object referencing this type
 */
export type MetricData = {
  currentValue: number;
  label: string;
};
