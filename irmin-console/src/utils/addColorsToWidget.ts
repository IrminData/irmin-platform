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
  const defaultColors = [
    '#FF0099',
    '#FF9900',
    '#66CC00',
    '#9900FF',
    '#0099FF',
    '#00CC66',
  ];

  const newWidgetData = { ...widgetData };
  newWidgetData.datasets = widgetData.datasets.map((dataset) => ({
    ...dataset,
    backgroundColor: defaultColors,
    borderColor: defaultColors,
    color: defaultColors,
  }));

  return newWidgetData;
}
