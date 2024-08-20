'use client';

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import WidgetWrapper from '@/components/dashboard/widget/WidgetWrapper';

import { addColorsToWidget } from '@/utils/addColorsToWidget';

import { Widget } from '@/types/api/Widget';
import { ChartOrTableWidgetData } from '@/types/internal/WidgetData';

// Register the components required for the chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Line chart widget
 *
 * @remarks
 *
 * This component is used to display a line chart widget on the dashboard.
 * It uses the ChartJS library to render the chart.
 */
const LineChart = ({ widget }: { widget: Widget }) => {
  const widgetData = addColorsToWidget(widget.data as ChartOrTableWidgetData);
  return (
    <WidgetWrapper widget={widget}>
      <Line
        data={widgetData}
        options={{
          scales: {
            y: {
              beginAtZero: true,
            },
          },
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

export default LineChart;
