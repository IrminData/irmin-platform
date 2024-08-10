'use client';

import WidgetWrapper from '@/components/dashboard/widget/WidgetWrapper';

import { Widget } from '@/types/api/Widget';
import { MetricWidgetData } from '@/types/internal/WidgetData';

/**
 * Metric widget
 *
 * @remarks
 *
 * This component is used to display a metric widget on the dashboard.
 * It displays a single metric value with a label.
 */
const Metric = ({ widget }: { widget: Widget }) => {
  const widgetData = widget.data as MetricWidgetData;

  return (
    <WidgetWrapper widget={widget}>
      <div className='flex h-full flex-grow items-center justify-center'>
        <div className='py-8'>
          <h4 className='mb-4 text-center text-xl font-bold text-irmin_black lg:text-3xl'>
            {widgetData.currentValue}
          </h4>
          <p className='text-center text-base text-gray-500 lg:text-lg'>
            {widgetData.label}
          </p>
        </div>
      </div>
    </WidgetWrapper>
  );
};

export default Metric;
