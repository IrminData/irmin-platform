import { Suspense } from 'react';

import { DataSetService } from '@/lib/api/DataSetService';

import AppTitle from '@/components/appTitle';
import DatasetTable from '@/components/tables/datasetTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { DataSet } from '@/types/DataSet';

export default async function DataSetsPage() {
  return (
    <>
      <AppTitle title='Data sets' />
      <Suspense fallback={<TableSkeleton />}>
        <DataSetsPageContent />
      </Suspense>
    </>
  );
}

async function DataSetsPageContent() {
  const dataService = DataSetService.getInstance();

  let dataSets: DataSet[] = await dataService.getAllDataSets();
  if (!dataSets || dataSets.length === 0) {
    dataSets = await dataService.fetchAllDataSets();
  }

  return <DatasetTable dataSets={dataSets} />;
}
