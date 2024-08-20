import { ChartOrTableWidgetData } from '@/types/internal/WidgetData';

/**
 * Add default colors to the widget data
 */
export function addColorsToWidget(widgetData: ChartOrTableWidgetData): {
  labels: string[];
  datasets: {
    label: string;
    data: (number | string)[];
    backgroundColor?: string | string[];
  }[];
} {
  const defaultColors = ['#462255', '#313B72', '#62A87C', '#7EE081', '#C3F3C0'];

  const newWidgetData = { ...widgetData };
  newWidgetData.datasets = widgetData.datasets.map((dataset) => ({
    ...dataset,
    backgroundColor: defaultColors,
    borderColor: defaultColors,
    color: defaultColors,
  }));

  return newWidgetData;
}
