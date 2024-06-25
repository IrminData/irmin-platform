'use client';

import { useState, useEffect } from 'react';
import AppTitle from '@/components/appTitle';
import DatasetTable from '@/components/tables/datasetTable';
import { DataSetService } from '@/lib/DataSetService';
import { DataSet } from '@/types/DataSet';
import LoadingSpinner from '@/components/misc/LoadingSpinner';
import TableSkeleton from '@/components/tables/tableSkeleton';

export default function DataSetsPage() {
  const dataService = DataSetService.getInstance();
  const [dataSets, setDataSets] = useState<DataSet[]>([]);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let fetchedDataSets = await dataService.getAllDataSets();
        if (!fetchedDataSets || fetchedDataSets.length === 0) {
          fetchedDataSets = await dataService.fetchAllDataSets();
        }
        if (fetchedDataSets) setDataSets(fetchedDataSets);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dataService]);

  if (loading) return <LoadingSpinner />;
  return (
    <>
      <AppTitle title='Data sets' />
      {loading ? <TableSkeleton /> : <DatasetTable dataSets={dataSets} />}
    </>
  );
}
