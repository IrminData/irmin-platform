import React from 'react';
import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

const TableSkeleton = ({ inSidebar = false }: { inSidebar?: boolean }) => {
  const rows = Array.from({ length: 5 }); // Adjust the number of skeleton rows as needed

  return (
    <div className='pb-8'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left font-light text-rich_black'>
          {!inSidebar && (
            <thead className='text-md border-b border-ash_gray'>
              <tr>
                <th className='px-4 py-2 text-xs font-normal xl:text-sm'>
                  <LoadingSkeleton width='100px' height='20px' />
                </th>
                <th className='max-w-36 px-4 py-2 text-center text-xs font-normal xl:text-sm'>
                  <LoadingSkeleton width='100px' height='20px' />
                </th>
                <th className='py-2 pl-4 pr-6 text-right text-xs font-normal xl:text-sm'>
                  <LoadingSkeleton width='100px' height='20px' />
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((_, index) => (
              <tr
                key={index}
                className={`${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } cursor-pointer transition-all hover:bg-gray-200`}
              >
                <td className='xl:text-md min-w-44 px-4 py-2 text-base'>
                  <LoadingSkeleton width='150px' height='20px' />
                  <br />
                  <LoadingSkeleton width='100px' height='15px' />
                </td>
                {!inSidebar && (
                  <>
                    <td className='px-4 py-2 text-center'>
                      <LoadingSkeleton width='80px' height='25px' />
                    </td>
                    <td className='px-4 py-2 text-right'>
                      <div className='flex justify-end space-x-2 align-middle text-xs xl:text-base'>
                        <LoadingSkeleton width='50px' height='20px' />
                        <LoadingSkeleton width='50px' height='20px' />
                        <LoadingSkeleton width='50px' height='20px' />
                        <LoadingSkeleton width='50px' height='20px' />
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableSkeleton;
