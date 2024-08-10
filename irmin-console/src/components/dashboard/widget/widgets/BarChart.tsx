'use client';

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import WidgetWrapper from '@/components/dashboard/widget/WidgetWrapper';

import { Widget } from '@/types/api/Widget';
import { ChartOrTableWidgetData } from '@/types/internal/WidgetData';

// Register the components required for the chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Bar chart widget
 *
 * @remarks
 *
 * This component is used to display a bar chart widget on the dashboard.
 * It uses the ChartJS library to render the chart.
 */
const BarChart = ({ widget }: { widget: Widget }) => {
  const widgetData = widget.data as ChartOrTableWidgetData;

  return (
    <WidgetWrapper widget={widget}>
      <Bar
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

export default BarChart;
