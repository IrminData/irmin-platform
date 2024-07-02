'use client';

import { Suspense, useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { DataSetService } from '@/lib/api/DataSetService';

import { IoChevronBack } from 'react-icons/io5';

import LoadingSkeleton from '@/components/misc/LoadingSkeleton';
import StatusElement from '@/components/tables/elements/statusElement';
import TableList from '@/components/tables/elements/tableList';
import TableListRow from '@/components/tables/elements/tableListRow';

import { DataSet } from '@/types/DataSet';

export default function DataSetViewerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Suspense
        fallback={
          <div className='w-full px-4'>
            <LoadingSkeleton className='my-0 h-10 w-full' />
          </div>
        }
      >
        <DataSetToolbar />
      </Suspense>
      <div className='w-full overflow-auto'>{children}</div>
    </>
  );
}

function DataSetToolbar() {
  const { dataSetID, workspace } = useParams();
  const dataSetService = DataSetService.getInstance();

  const [dataSet, setDataSet] = useState<DataSet | undefined>(undefined);
  useEffect(() => {
    async function fetchData() {
      if (dataSetID && !dataSet) {
        const data = await dataSetService.fetchDataSetById(Number(dataSetID));
        setDataSet(data);
      }
    }
    fetchData();
  }, [dataSetID, setDataSet, dataSet, dataSetService]);

  const actions = [
    {
      label: 'View',
      primary: true,
      href: `/app/${workspace}/data-sets/viewer/${dataSet?.id}`,
    },
    {
      label: 'Logs',
      primary: false,
      href: `/app/${workspace}/data-sets/viewer/${dataSet?.id}/logs`,
    },
  ];
  if (dataSet?.status === 'connected') {
    actions.push(
      {
        label: 'View info',
        primary: false,
        href: `/app/${workspace}/data-sets/viewer/${dataSet?.id}/settings`,
      },
      {
        label: 'Disconnect',
        primary: false,
        href: `/app/${workspace}/data-sets/viewer/${dataSet?.id}/settings`,
      }
    );
  } else {
    actions.push({
      label: 'Edit',
      primary: false,
      href: `/app/${workspace}/data-sets/viewer/${dataSet?.id}/settings`,
    });
  }

  return (
    <TableList className='pb-0'>
      <TableListRow actions={actions} disableHover={true}>
        <div className='flex flex-row gap-2'>
          <Link href={`/app/${workspace}/data-sets/`} title='Back'>
            <IoChevronBack size={40} className='text-irmin_blue' />
          </Link>
          <div className='min-w-44 px-4 py-0 pr-5 text-base md:pr-10 xl:text-base'>
            {dataSet?.name ?? ''}
            <br />
            {dataSet?.status === 'connected' ? (
              <span className='text-xs text-irmin_blue'>
                Source: {dataSet?.sourceWorkspace}
              </span>
            ) : dataSet?.source === 'connection' ? (
              <span className='text-xs text-irmin_blue'>
                Source connection: {dataSet?.sourceConnection}
              </span>
            ) : (
              <span className='text-xs text-irmin_blue'>
                File: {dataSet?.scriptFile}
              </span>
            )}
          </div>
        </div>
        <StatusElement
          accessStatus={dataSet?.status}
          statusLabel={dataSet?.status ?? ''}
        />
      </TableListRow>
    </TableList>
  );
}
