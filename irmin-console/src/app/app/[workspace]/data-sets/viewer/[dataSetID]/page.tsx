'use client';

import React, { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';

import { DataSetService } from '@/lib/api/DataSetService';

import LoadingSkeleton from '@/components/misc/LoadingSkeleton';
import QueryResultsAndTabs from '@/components/queryResultsAndTabs';
import ScriptEditor from '@/components/script-editor/scriptEditor';

import { DataSet } from '@/types/DataSet';

export default function DataSetEditorPage() {
  const { dataSetID } = useParams();
  const dataSetService = DataSetService.getInstance();
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
      {(dataSet?.source === 'sql' || dataSet?.source === 'python') &&
      dataSet?.sourceScript ? (
        <ScriptEditor
          content={dataSet.sourceScript}
          language={dataSet.source === 'sql' ? 'sql' : 'python'}
          editorHeight={editorHeight}
          setEditorHeight={setEditorHeight}
        />
      ) : (
        <div className='p-4'>
          <span className='text-lg text-irmin_blue'>
            Connection: {dataSet?.sourceConnection}
          </span>
        </div>
      )}
      {dataSet && (
        <QueryResultsAndTabs editorHeight={editorHeight} dataSet={dataSet} />
      )}
    </div>
  );
}
