import React from 'react';

import { IoSettings } from 'react-icons/io5';

import Button from '@/components/misc/Button';

import { Visualisation } from '@/types/DataSet';

const ScrollableTable = ({
  visualisation,
}: {
  visualisation: Visualisation;
}) => {
  if (visualisation.type !== 'table') return <></>;
  return (
    <div
      className='rounded border-t-2 border-irmin_green bg-white p-2 shadow-lg md:p-4'
      id={`scrollable-table-widget-${visualisation.id}`}
    >
      <div className='flex h-14 items-center justify-between border-b px-6 py-4'>
        <h2 className='text-xl font-semibold leading-tight'>
          {visualisation.title}
        </h2>
        <Button
          variant='icon'
          colorScheme='primary'
          onClick={() => {
            // TODO: Implement settings modal
          }}
        >
          <IoSettings size={18} />
        </Button>
      </div>
      <div className='inline-block max-h-80 min-w-full max-w-[calc(100vw-4px)] overflow-scroll align-middle'>
        <table className='min-w-full'>
          <thead className='sticky top-0 bg-irmin_green'>
            <tr>
              {visualisation.data.datasets[0].label && (
                <td className='whitespace-no-wrap p-2 md:px-6 md:py-3'> </td>
              )}
              {visualisation.data.labels.map((column, index) => (
                <th
                  key={`scrollable-table-widget-${visualisation.id}-header-${index}`}
                  className='p-2 text-left text-xs font-medium uppercase leading-4 tracking-wider text-white md:px-6 md:py-3'
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='max-h-80 bg-white'>
            {visualisation.data.datasets.map((row, rowIndex) => (
              <tr
                key={`scrollable-table-widget-${visualisation.id}-row-${rowIndex}`}
                className='text-xs leading-5 text-gray-900 md:h-12 md:text-sm'
              >
                {row.label && (
                  <td className='whitespace-no-wrap border-b border-gray-200 p-2 md:px-6 md:py-3'>
                    {row.label}
                  </td>
                )}
                {row.data.map((col, colIndex) => (
                  <td
                    key={`scrollable-table-widget-${visualisation.id}-row-${rowIndex}-col-${colIndex}`}
                    className='whitespace-no-wrap border-b border-gray-200 p-2 md:px-6 md:py-3'
                  >
                    {typeof col === 'number' ? col.toFixed(2) : col}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScrollableTable;
