import WidgetWrapper from '@/components/dashboard/widget/WidgetWrapper';

import { Widget } from '@/types/api/Widget';
import { ChartOrTableWidgetData } from '@/types/internal/WidgetData';

/**
 * Scrollable table widget
 *
 * @remarks
 *
 * This component is used to display a scrollable table widget on the dashboard.
 * It displays a table with a fixed header and scrollable body.
 */
const ScrollableTable = ({ widget }: { widget: Widget }) => {
  const widgetData = widget.data as ChartOrTableWidgetData;
  return (
    <WidgetWrapper widget={widget}>
      <table className='h-full w-full overflow-scroll'>
        <thead className='sticky top-0 bg-irmin_green'>
          <tr>
            {widgetData.datasets[0].label && (
              <td className='whitespace-no-wrap p-2 md:px-6 md:py-3'> </td>
            )}
            {widgetData.labels.map((column, index) => (
              <th
                key={`scrollable-table-widget-${widget.id}-header-${index}`}
                className='p-2 text-left text-xs font-medium uppercase leading-4 tracking-wider text-white md:px-6 md:py-3'
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='bg-white'>
          {widgetData.datasets.map((row, rowIndex) => (
            <tr
              key={`scrollable-table-widget-${widget.id}-row-${rowIndex}`}
              className='text-xs leading-5 text-gray-900 md:h-12 md:text-sm'
            >
              {row.label && (
                <td className='whitespace-no-wrap border-b border-gray-200 p-2 md:px-6 md:py-3'>
                  {row.label}
                </td>
              )}
              {row.data.map((col, colIndex) => (
                <td
                  key={`scrollable-table-widget-${widget.id}-row-${rowIndex}-col-${colIndex}`}
                  className='whitespace-no-wrap border-b border-gray-200 p-2 md:px-6 md:py-3'
                >
                  {typeof col === 'number' ? col.toFixed(2) : col}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </WidgetWrapper>
  );
};

export default ScrollableTable;
