export type WidgetType = 'line' | 'bar' | 'table' | 'metric';
export interface Widget {
  id: number;
  dashboard: number; // ID of the dashboard this widget belongs to
  type: WidgetType;
  title: string;
  data: ChartOrTableData | MetricData;
}

export type ChartOrTableData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
};
export type MetricData = {
  currentValue: number;
  label: string;
};
