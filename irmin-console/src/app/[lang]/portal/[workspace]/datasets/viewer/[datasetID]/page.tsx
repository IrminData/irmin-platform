// 'use client';

// import React, { useEffect, useState } from 'react';

// import { useParams } from 'next/navigation';

// import DatasetService from '@/lib/api/DatasetService';

// import ActionEditor from '@/components/action-editor/actionEditor';
// import ActionResultsAndTabs from '@/components/actionResultsAndTabs';
// import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

// import { useLocale } from '@/context/LocaleContext';

// import { Dataset } from '@/types/api/Dataset';

export default function DatasetEditorPage() {
  return <></>;
  // const { locale, dict } = useLocale();
  // const { datasetID } = useParams();
  // const datasetService = DatasetService.getInstance(locale);
  // const [editorHeight, setEditorHeight] = useState('400px');

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
  //     <div className='p-4'>
  //       <LoadingSkeleton className='h-52 w-full' />
  //     </div>
  //   );
  // }
  // return (
  //   <div className='w-full overflow-auto bg-white'>
  //     {dataset?.source !== 'connection' && dataset?.sourceScript ? (
  //       <ActionEditor
  //         content={dataset.sourceScript}
  //         language={dataset.source}
  //         editorHeight={editorHeight}
  //         setEditorHeight={setEditorHeight}
  //       />
  //     ) : (
  //       <div className='p-4'>
  //         <span className='text-lg text-irmin_blue'>
  //           {dict.connection.connection}: {dataset?.sourceConnection}
  //         </span>
  //       </div>
  //     )}
  //     {dataset && (
  //       <ActionResultsAndTabs editorHeight={editorHeight} dataset={dataset} />
  //     )}
  //   </div>
  // );
}
