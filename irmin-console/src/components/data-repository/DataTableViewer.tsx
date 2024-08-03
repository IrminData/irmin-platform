'use client';

import DataTable from 'react-data-table-component';

import { AiOutlineDownload } from 'react-icons/ai';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';

/**
 * Placeholder data for the table
 */
const placeholderData = [
  { name: 'John Doe', age: 25, city: 'New York', country: 'USA' },
  { name: 'Jane Doe', age: 26, city: 'Toronto', country: 'Canada' },
  { name: 'John Smith', age: 30, city: 'London', country: 'UK' },
  { name: 'Jane Smith', age: 22, city: 'Paris', country: 'France' },
  { name: 'John Johnson', age: 28, city: 'Berlin', country: 'Germany' },
  { name: 'Jane Johnson', age: 29, city: 'Tokyo', country: 'Japan' },
  { name: 'John Williams', age: 27, city: 'Sydney', country: 'Australia' },
  {
    name: 'Jane Williams',
    age: 24,
    city: 'Cape Town',
    country: 'South Africa',
  },
  { name: 'John Brown', age: 23, city: 'Rio de Janeiro', country: 'Brazil' },
  { name: 'Jane Brown', age: 31, city: 'Moscow', country: 'Russia' },
  { name: 'John Davis', age: 33, city: 'Beijing', country: 'China' },
  { name: 'Jane Davis', age: 32, city: 'New Delhi', country: 'India' },
  { name: 'John Miller', age: 34, city: 'Seoul', country: 'South Korea' },
  { name: 'Jane Miller', age: 35, city: 'Cairo', country: 'Egypt' },
  {
    name: 'John Wilson',
    age: 36,
    city: 'Cape Town',
    country: 'South Africa',
  },
  { name: 'Jane Wilson', age: 37, city: 'Lagos', country: 'Nigeria' },
  { name: 'John Moore', age: 38, city: 'Mexico City', country: 'Mexico' },
  { name: 'Jane Moore', age: 39, city: 'Buenos Aires', country: 'Argentina' },
  { name: 'John Taylor', age: 40, city: 'Santiago', country: 'Chile' },
  { name: 'Jane Taylor', age: 41, city: 'Helsinki', country: 'Finland' },
];
const placeholderColumns = [
  {
    name: 'Name',
    sortable: true,
    selector: (e: (typeof placeholderData)[0]) => e.name,
  },
  {
    name: 'Age',
    sortable: true,
    selector: (e: (typeof placeholderData)[0]) => e.age,
  },
  {
    name: 'City',
    sortable: true,
    selector: (e: (typeof placeholderData)[0]) => e.city,
  },
  {
    name: 'Country',
    sortable: true,
    selector: (e: (typeof placeholderData)[0]) => e.country,
  },
];

/**
 * Data Table Viewer component for displaying the data for a single Workspace DB table.
 *
 * @param props0 - The props
 * @param props0.title - The title of the table
 *
 * @returns The Data Repo Widgets component
 */
const DataTableViewer = ({ title }: { title: string }) => {
  const { dict } = useLocale();

  return (
    <div className='pb-28'>
      {/* Action Buttons */}
      <div className='flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs md:flex-row'>
        <p className='ml-0 inline text-gray-400'>{title}</p>
        <p className='inline text-irmin_blue md:ml-auto md:pl-2'>
          {`${placeholderData.length} ${dict.dataRepository.rowsReturnedIn} 1.5s`}
        </p>
        <div className='text-right md:ml-2'>
          <Button
            icon={<AiOutlineDownload />}
            colorScheme='secondary'
            variant='link'
            size='sm'
          >
            {dict.editor.exportTable}
          </Button>
        </div>
      </div>
      {/* Table */}
      <div className='overflow-auto'>
        <DataTable columns={placeholderColumns} data={placeholderData} />
      </div>
    </div>
  );
};

export default DataTableViewer;
