/**
 * Widget data type for all widgets
 */
export type WidgetData = ChartOrTableWidgetData | MetricWidgetData;

/**
 * Data for a chart or table widget
 *
 * @typeParam labels - Labels for the data
 * @typeParam datasets - Data for the chart or table
 */
export type ChartOrTableWidgetData = {
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
 *
 * @typeParam currentValue - Current value of the metric
 * @typeParam label - Label for the metric
 */
export type MetricWidgetData = {
  currentValue: number;
  label: string;
};
