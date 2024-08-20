'use client';

import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Pie } from 'react-chartjs-2';

import WidgetWrapper from '@/components/dashboard/widget/WidgetWrapper';

import { addColorsToWidget } from '@/utils/addColorsToWidget';

import { Widget } from '@/types/api/Widget';
import { ChartOrTableWidgetData } from '@/types/internal/WidgetData';

// Register the components required for the chart
ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Pie chart widget
 *
 * @remarks
 *
 * This component is used to display a pie chart widget on the dashboard.
 * It uses the ChartJS library to render the chart.
 */
const PieChart = ({ widget }: { widget: Widget }) => {
  const widgetData = addColorsToWidget(widget.data as ChartOrTableWidgetData);
  return (
    <WidgetWrapper widget={widget}>
      <Pie
        data={widgetData}
        options={{
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
          },
          maintainAspectRatio: false,
        }}
        style={{ height: '400px', width: '100%', maxHeight: '400px' }}
      />
    </WidgetWrapper>
  );
};

export default PieChart;
