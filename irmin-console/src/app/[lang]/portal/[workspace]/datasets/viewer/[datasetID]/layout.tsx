'use client';

// import { useEffect, useState } from 'react';

// import Link from 'next/link';
// import { useParams } from 'next/navigation';

// import DatasetService from '@/lib/api/DatasetService';

// import { IoChevronBack } from 'react-icons/io5';

// import LoadingSkeleton from '@/components/misc/LoadingSkeleton';
// import List from '@/components/tables/elements/list';
// import StatusElement from '@/components/tables/elements/statusElement';

// import { useLocale } from '@/context/LocaleContext';

// import { Dataset } from '@/types/api/Dataset';

export default function DatasetViewerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <DatasetToolbar />
      <div className='w-full overflow-auto'>{children}</div>
    </>
  );
}

function DatasetToolbar() {
  return <></>;
  // const { locale, dict } = useLocale();
  // const { datasetID, workspace } = useParams();
  // const datasetService = DatasetService.getInstance(locale);

  // const [dataset, setDataset] = useState<Dataset | undefined>(undefined);
  // useEffect(() => {
  //   async function fetchData() {
  //     if (datasetID && !dataset) {
  //       const data = await datasetService.fetchDatasetById(Number(datasetID));
  //       setDataset(data);
  //     }
  //   }
  //   fetchData();
  // }, [datasetID, setDataset, dataset, datasetService]);

  // if (!dataset) {
  //   return (
  //     <div className='w-full px-4'>
  //       <LoadingSkeleton className='my-0 h-10 w-full' />
  //     </div>
  //   );
  // }

  // const actions = [
  //   {
  //     label: dict.list.datasets.view,
  //     primary: true,
  //     href: `/portal/${workspace}/data-sets/viewer/${dataset?.id}`,
  //   },
  //   {
  //     label: 'Logs',
  //     primary: false,
  //     href: `/portal/${workspace}/data-sets/viewer/${dataset?.id}/logs`,
  //   },
  // ];
  // if (dataset.status === 'connected') {
  //   actions.push(
  //     {
  //       label: dict.list.datasets.viewInfo,
  //       primary: false,
  //       href: `/portal/${workspace}/data-sets/viewer/${dataset.id}/settings`,
  //     },
  //     {
  //       label: dict.list.datasets.disconnect,
  //       primary: false,
  //       href: `/portal/${workspace}/data-sets/viewer/${dataset.id}/settings`,
  //     }
  //   );
  // } else {
  //   actions.push({
  //     label: dict.list.datasets.edit,
  //     primary: false,
  //     href: `/portal/${workspace}/data-sets/viewer/${dataset.id}/settings`,
  //   });
  // }
  // return (
  //   <List
  //     hideHeaders={true}
  //     headers={[
  //       dict.list.datasets.name,
  //       dict.list.datasets.status,
  //       dict.list.datasets.actions,
  //     ]}
  //     rows={[
  //       {
  //         columns: [
  //           <div className='flex flex-row' key={'data-set-details'}>
  //             <Link href={`/portal/${workspace}/data-sets/`} title='Back'>
  //               <IoChevronBack size={40} className='text-irmin_blue' />
  //             </Link>
  //             <div className='min-w-44 px-4 py-0 pr-5 text-base md:pr-10 xl:text-base'>
  //               {dataset?.name ?? ''}
  //               <br />
  //               {dataset?.status === 'connected' ? (
  //                 <span className='text-xs text-irmin_blue'>
  //                   {dict.list.datasets.source}: {dataset?.sourceWorkspace}
  //                 </span>
  //               ) : dataset?.source === 'connection' ? (
  //                 <span className='text-xs text-irmin_blue'>
  //                   {dict.list.datasets.source}: {dataset?.sourceConnection}
  //                 </span>
  //               ) : (
  //                 <span className='text-xs text-irmin_blue'>
  //                   {dict.list.datasets.source}: {dataset?.scriptFile}
  //                 </span>
  //               )}
  //             </div>
  //           </div>,
  //           <StatusElement
  //             accessStatus={dataset?.status}
  //             statusLabel={dataset?.status ?? ''}
  //             key={'data-set-status'}
  //           />,
  //         ],
  //         actions,
  //       },
  //     ]}
  //   />
  // );
}
