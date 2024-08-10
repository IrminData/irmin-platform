'use client';

import React, { useState } from 'react';

import { useTheme } from 'next-themes';
import DataTable from 'react-data-table-component';

import { AiOutlineDownload, AiOutlineSave } from 'react-icons/ai';
import { BsFileEarmarkRichtext } from 'react-icons/bs';
import { CiTextAlignLeft } from 'react-icons/ci';
import { MdPlayArrow } from 'react-icons/md';
import { TbFileText, TbTable } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import MDXEditor from '@/components/common/markdown-editor/MDXEditor';

import { useLocale } from '@/context/LocaleContext';

import { downloadCSV } from '@/utils/csv';

import { ActionWorkflow } from '@/types/api/Workflow';

import Input from '../common/form/Input';

/**
 * Placeholder data for the table
 */
const placeholderData = [
  {
    name: 'John Doe',
    age: 25,
    city: 'New York',
    country: 'USA',
    email: 'johndoe@example.com',
    jobTitle: 'Software Engineer',
    company: 'TechCorp',
  },
  {
    name: 'Jane Doe',
    age: 26,
    city: 'Toronto',
    country: 'Canada',
    email: 'janedoe@example.com',
    jobTitle: 'Product Manager',
    company: 'Innovatech',
  },
  {
    name: 'John Smith',
    age: 30,
    city: 'London',
    country: 'UK',
    email: 'johnsmith@example.com',
    jobTitle: 'Data Analyst',
    company: 'DataSolve',
  },
  {
    name: 'Jane Smith',
    age: 22,
    city: 'Paris',
    country: 'France',
    email: 'janesmith@example.com',
    jobTitle: 'Graphic Designer',
    company: 'DesignHub',
  },
  {
    name: 'John Johnson',
    age: 28,
    city: 'Berlin',
    country: 'Germany',
    email: 'johnjohnson@example.com',
    jobTitle: 'DevOps Engineer',
    company: 'CloudBase',
  },
  {
    name: 'Jane Johnson',
    age: 29,
    city: 'Tokyo',
    country: 'Japan',
    email: 'janejohnson@example.com',
    jobTitle: 'UX Researcher',
    company: 'UserFirst',
  },
  {
    name: 'John Williams',
    age: 27,
    city: 'Sydney',
    country: 'Australia',
    email: 'johnwilliams@example.com',
    jobTitle: 'Accountant',
    company: 'FinancePro',
  },
  {
    name: 'Jane Williams',
    age: 24,
    city: 'Cape Town',
    country: 'South Africa',
    email: 'janewilliams@example.com',
    jobTitle: 'Marketing Specialist',
    company: 'BrandMakers',
  },
  {
    name: 'John Brown',
    age: 23,
    city: 'Rio de Janeiro',
    country: 'Brazil',
    email: 'johnbrown@example.com',
    jobTitle: 'Sales Manager',
    company: 'SalesForce',
  },
  {
    name: 'Jane Brown',
    age: 31,
    city: 'Moscow',
    country: 'Russia',
    email: 'janebrown@example.com',
    jobTitle: 'HR Coordinator',
    company: 'PeopleOps',
  },
  {
    name: 'John Davis',
    age: 33,
    city: 'Beijing',
    country: 'China',
    email: 'johndavis@example.com',
    jobTitle: 'Business Analyst',
    company: 'BizInsights',
  },
  {
    name: 'Jane Davis',
    age: 32,
    city: 'New Delhi',
    country: 'India',
    email: 'janedavis@example.com',
    jobTitle: 'Consultant',
    company: 'AdvisoryCo',
  },
  {
    name: 'John Miller',
    age: 34,
    city: 'Seoul',
    country: 'South Korea',
    email: 'johnmiller@example.com',
    jobTitle: 'Project Manager',
    company: 'PM Solutions',
  },
  {
    name: 'Jane Miller',
    age: 35,
    city: 'Cairo',
    country: 'Egypt',
    email: 'janemiller@example.com',
    jobTitle: 'Architect',
    company: 'UrbanBuild',
  },
  {
    name: 'John Wilson',
    age: 36,
    city: 'Cape Town',
    country: 'South Africa',
    email: 'johnwilson@example.com',
    jobTitle: 'Research Scientist',
    company: 'LabWorks',
  },
  {
    name: 'Jane Wilson',
    age: 37,
    city: 'Lagos',
    country: 'Nigeria',
    email: 'janewilson@example.com',
    jobTitle: 'Financial Analyst',
    company: 'FinAdvisors',
  },
  {
    name: 'John Moore',
    age: 38,
    city: 'Mexico City',
    country: 'Mexico',
    email: 'johnmoore@example.com',
    jobTitle: 'Operations Manager',
    company: 'GlobalOps',
  },
  {
    name: 'Jane Moore',
    age: 39,
    city: 'Buenos Aires',
    country: 'Argentina',
    email: 'janemoore@example.com',
    jobTitle: 'Content Strategist',
    company: 'MediaHouse',
  },
  {
    name: 'John Taylor',
    age: 40,
    city: 'Santiago',
    country: 'Chile',
    email: 'johntaylor@example.com',
    jobTitle: 'Engineer',
    company: 'BuildTech',
  },
  {
    name: 'Jane Taylor',
    age: 41,
    city: 'Helsinki',
    country: 'Finland',
    email: 'janetaylor@example.com',
    jobTitle: 'Legal Advisor',
    company: 'LawFirm',
  },
];

const placeholderColumns = [
  {
    name: 'Name',
    sortable: true,
    reorder: true,
    selector: (e: (typeof placeholderData)[0]) => e.name,
  },
  {
    name: 'Age',
    sortable: true,
    reorder: true,
    selector: (e: (typeof placeholderData)[0]) => e.age,
  },
  {
    name: 'City',
    sortable: true,
    reorder: true,
    selector: (e: (typeof placeholderData)[0]) => e.city,
  },
  {
    name: 'Country',
    sortable: true,
    reorder: true,
    selector: (e: (typeof placeholderData)[0]) => e.country,
  },
  {
    name: 'Email',
    sortable: true,
    reorder: true,
    selector: (e: (typeof placeholderData)[0]) => e.email,
  },
  {
    name: 'Job Title',
    sortable: true,
    reorder: true,
    selector: (e: (typeof placeholderData)[0]) => e.jobTitle,
  },
  {
    name: 'Company',
    sortable: true,
    reorder: true,
    selector: (e: (typeof placeholderData)[0]) => e.company,
  },
];

/**
 * Query Results component
 *
 * Used by different pages to display  results of files, actions, queries, etc.
 */
const QueryResults = ({
  title,
  actionWorkflow,
}: {
  title: string;
  actionWorkflow?: ActionWorkflow;
}) => {
  const theme = useTheme();
  const { dict } = useLocale();

  const [activeTab, setActiveTab] = useState('data');

  const [currentDocumentation, setCurrentDocumentation] = useState(
    actionWorkflow?.documentation ?? ''
  );
  const [documentationTab, setDocumentationTab] = useState<'mdx' | 'plain'>(
    'mdx'
  );

  const [filterText, setFilterText] = React.useState('');
  //   const [resetPaginationToggle, setResetPaginationToggle] =
  //     React.useState(false);

  const filteredItems = placeholderData.filter((item) => {
    return Object.keys(item).some((key) => {
      const value = key in item ? item[key as keyof typeof item] : undefined;
      return (
        value &&
        value.toString().toLowerCase().includes(filterText.toLowerCase())
      );
    });
  });

  //   const handleClear = () => {
  //     if (filterText) {
  //       setResetPaginationToggle(!resetPaginationToggle);
  //       setFilterText('');
  //     }
  //   };
  const handleRowsSelected = (selected: {
    allSelected: boolean;
    selectedCount: number;
    selectedRows: (typeof placeholderData)[0][];
  }) => {
    console.log(selected);
    // TODO: Do something with the selected rows
  };

  return (
    <>
      {/* Tab Buttons */}
      <div className='mb-0 mt-4 flex w-full flex-wrap justify-start gap-2 border-gray-200 px-2 md:border-b'>
        <div
          className={`border-irmin_green bg-white ${activeTab === 'data' ? 'border-b-2' : ''}`}
        >
          <Button
            ariaLabel={`Switch to data viewer tab`}
            size='sm'
            variant='outline'
            colorScheme={activeTab === 'data' ? 'secondary' : 'gray'}
            className={`justify-start rounded-none text-xs shadow-none hover:no-underline`}
            onClick={() => setActiveTab('data')}
            icon={<TbTable />}
          >
            {dict.query.results}
          </Button>
        </div>
        {actionWorkflow && (
          <div
            className={`border-irmin_green bg-white ${activeTab === 'documentation' ? 'border-b-2' : ''}`}
          >
            <Button
              ariaLabel={`Switch to documentation tab`}
              size='sm'
              variant='outline'
              colorScheme={activeTab === 'documentation' ? 'secondary' : 'gray'}
              className={`justify-start rounded-none text-xs shadow-none hover:no-underline`}
              onClick={() => setActiveTab('documentation')}
              icon={<TbFileText />}
            >
              {dict.documentation.documentation}
            </Button>
          </div>
        )}
        <div className='mb-2 ml-auto flex gap-2 text-right'>
          {activeTab === 'documentation' && (
            <Button
              onClick={() =>
                setDocumentationTab(
                  documentationTab === 'mdx' ? 'plain' : 'mdx'
                )
              }
              variant='link'
              colorScheme={'gray'}
              size='sm'
              className='min-w-48 p-0 text-xs'
              icon={
                documentationTab === 'mdx' ? (
                  <BsFileEarmarkRichtext />
                ) : (
                  <CiTextAlignLeft />
                )
              }
            >
              {documentationTab === 'mdx'
                ? dict.documentation.switchToPlainText
                : dict.documentation.switchToMarkdownEditor}
            </Button>
          )}
          <Button
            icon={<AiOutlineSave />}
            colorScheme='light'
            variant='solid'
            size='sm'
            className='text-xs'
          >
            {dict.query.save}
          </Button>
          <Button
            icon={<MdPlayArrow />}
            colorScheme='primary'
            variant='solid'
            size='sm'
            className='text-xs'
          >
            {dict.query.run}
          </Button>
        </div>
      </div>
      {activeTab === 'data' && (
        <>
          {/* Title, metadata and actions */}
          <div className='flex items-center justify-start border px-4 py-1 text-xs'>
            <p className='ml-0 inline text-gray-400'>{title}</p>
            <p className='inline text-irmin_blue md:ml-auto md:pl-2'>
              {`${placeholderData.length} ${dict.query.rowsReturnedIn} 1.5s`}
            </p>
            <div className='flex-grow'></div>
            <div className='ml-auto flex flex-row gap-2'>
              <Button
                icon={<AiOutlineDownload />}
                colorScheme='secondary'
                variant='link'
                size='sm'
                onClick={() => downloadCSV(placeholderData, title)}
              >
                {dict.query.exportTable}
              </Button>
              <Input
                variant='underline'
                colorScheme='gray'
                size='sm'
                className='w-48'
                placeholder={dict.query.search}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </div>
          {/* Table */}
          <div className='relative flex h-0 flex-grow overflow-scroll'>
            <div className='absolute h-full w-full'>
              <DataTable
                onSelectedRowsChange={handleRowsSelected}
                columns={placeholderColumns}
                data={filteredItems}
                selectableRows
                // dense
                pagination
                paginationPerPage={13}
                paginationComponentOptions={{
                  rowsPerPageText: dict.query.rowsPerPage,
                  rangeSeparatorText: dict.query.rangeSeparator,
                  selectAllRowsItem: true,
                  selectAllRowsItemText: dict.query.selectAllRows,
                }}
                // paginationResetDefaultPage={resetPaginationToggle}
                persistTableHead
                theme={theme.theme === 'dark' ? 'dark' : 'default'}
                customStyles={{
                  pagination: {
                    style: {
                      justifyContent: 'flex-start',
                    },
                  },
                }}
              />
            </div>
          </div>
        </>
      )}
      {activeTab === 'documentation' && (
        <>
          {documentationTab === 'plain' && (
            <textarea
              className='h-full w-full p-2 focus:outline-none'
              placeholder={dict.documentation.startTypingDocumentation}
              value={currentDocumentation}
              onChange={(e) => {
                setCurrentDocumentation(e.target.value);
              }}
            />
          )}
          {documentationTab === 'mdx' && (
            <MDXEditor
              className='h-full w-full focus:outline-none'
              contentEditableClassName='h-full w-full p-2 focus:outline-none'
              placeholder={dict.documentation.startTypingDocumentation}
              markdown={currentDocumentation}
              onChange={(markdown) => {
                setCurrentDocumentation(markdown);
              }}
            />
          )}
        </>
      )}
    </>
  );
};

export default QueryResults;
