import AppTitle from '@/components/appTitle';
import DatasetTable from '@/components/datasetTable';

export default function DataSetsPage() {
  return (
    <>
      <AppTitle title='Data sets' />
      <DatasetTable
        dataSets={[
          {
            id: 0,
            name: 'UpCharge rents, users and venues',
            sourceWorkspace: 'UpCharge',
            status: 'private',
          },
          {
            id: 1,
            name: 'UpCharge locations',
            sourceWorkspace: 'UpCharge',
            status: 'public',
          },
          {
            id: 2,
            name: 'Restaurants in Finland',
            sourceWorkspace: 'TripAdvisor',
            status: 'connected',
          },
        ]}
      />
    </>
  );
}
