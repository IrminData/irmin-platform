import { Suspense } from 'react';

import { DataSetService } from '@/lib/api/DataSetService';

import AppTitle from '@/components/appTitle';
import DatasetTable from '@/components/tables/datasetTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { DataSet } from '@/types/DataSet';

export default async function DataSetsPage() {
  const { dict } = useLocale();
  return (
    <>
      <AppTitle title={dict.dashboardNavigation.links.dataSets} />
      <Suspense fallback={<TableSkeleton />}>
        <DataSetsPageContent />
      </Suspense>
    </>
  );
}

async function DataSetsPageContent() {
  const { locale } = useLocale();

  const dataService = DataSetService.getInstance(locale);

  let dataSets: DataSet[] = await dataService.getAllDataSets();
  if (!dataSets || dataSets.length === 0) {
    dataSets = await dataService.fetchAllDataSets();
  }

  return <DatasetTable dataSets={dataSets} />;
}
