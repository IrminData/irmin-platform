'use client';

import { Suspense } from 'react';

import { DataSetService } from '@/lib/api/DataSetService';

import PortalTitle from '@/components/portalTitle';
import DatasetTable from '@/components/tables/datasetTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { DataSet } from '@/types/DataSet';

export default function DataSetsPage() {
  const { dict, locale } = useLocale();
  return (
    <>
      <PortalTitle title={dict.dashboardNavigation.links.dataSets} />
      <Suspense fallback={<TableSkeleton />}>
        <DataSetsPageContent locale={locale} />
      </Suspense>
    </>
  );
}

async function DataSetsPageContent({ locale }: { locale: string }) {
  const dataService = DataSetService.getInstance(locale);

  let dataSets: DataSet[] = await dataService.getAllDataSets();
  if (!dataSets || dataSets.length === 0) {
    dataSets = await dataService.fetchAllDataSets();
  }

  return <DatasetTable dataSets={dataSets} />;
}
