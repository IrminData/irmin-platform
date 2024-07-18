'use client';

import React, { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';

import { DataSetService } from '@/lib/api/DataSetService';

import ActionEditor from '@/components/action-editor/actionEditor';
import ActionResultsAndTabs from '@/components/actionResultsAndTabs';
import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { DataSet } from '@/types/DataSet';

export default function DataSetEditorPage() {
  const { locale, dict } = useLocale();
  const { dataSetID } = useParams();
  const dataSetService = DataSetService.getInstance(locale);
  const [editorHeight, setEditorHeight] = useState('400px');

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

  if (!dataSet) {
    return (
      <div className='p-4'>
        <LoadingSkeleton className='h-52 w-full' />
      </div>
    );
  }
  return (
    <div className='w-full overflow-auto bg-white'>
      {dataSet?.source !== 'connection' && dataSet?.sourceScript ? (
        <ActionEditor
          content={dataSet.sourceScript}
          language={dataSet.source}
          editorHeight={editorHeight}
          setEditorHeight={setEditorHeight}
        />
      ) : (
        <div className='p-4'>
          <span className='text-lg text-irmin_blue'>
            {dict.connection.connection}: {dataSet?.sourceConnection}
          </span>
        </div>
      )}
      {dataSet && (
        <ActionResultsAndTabs editorHeight={editorHeight} dataSet={dataSet} />
      )}
    </div>
  );
}
