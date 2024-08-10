'use client';

import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

import WidgetWrapper from '@/components/dashboard/widget/WidgetWrapper';

import { Widget } from '@/types/api/Widget';
import { ChartOrTableWidgetData } from '@/types/internal/WidgetData';

// Register the components required for the chart
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

/**
 * Radar chart widget
 *
 * @remarks
 *
 * This component is used to display a radar chart widget on the dashboard.
 * It uses the ChartJS library to render the chart.
 */
const RadarChart = ({ widget }: { widget: Widget }) => {
  const widgetData = widget.data as ChartOrTableWidgetData;

  return (
    <WidgetWrapper widget={widget}>
      <Radar
        data={widgetData}
        options={{
          scales: {
            r: {
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

export default RadarChart;
