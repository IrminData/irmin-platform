import React from 'react';
import { IoSettings } from 'react-icons/io5';

interface Column {
  header: string;
  accessor: string; // Matches with keys in data
}

interface TableProps {
  title: string;
  columns: Column[];
  data: Record<string, any>[];
}

const ScrollableTable: React.FC<TableProps> = ({ title, columns, data }) => {
  return (
    <div className='p-4'>
      <div className='flex h-14 items-center justify-between border-b px-6 py-4'>
        <h2 className='text-xl font-semibold leading-tight'>{title}</h2>
        <button
          className='text-gray-200 transition duration-300 hover:text-ash_gray-600'
          onClick={() => {
            // TODO: Implement settings modal
          }}
        >
          <IoSettings size={20} />
        </button>
      </div>
      <div className='mt-6'>
        <div className='inline-block max-h-80 min-w-full overflow-hidden overflow-y-scroll rounded-lg border-b border-gray-200 align-middle shadow'>
          <table className='min-w-full'>
            <thead className='sticky top-0 bg-ash_gray'>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className='border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase leading-4 tracking-wider text-white'
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='max-h-80 bg-white'>
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className='h-12 text-sm leading-5 text-gray-900'
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className='whitespace-no-wrap border-b border-gray-200 px-6 py-4'
                    >
                      {row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScrollableTable;
