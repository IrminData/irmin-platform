import AppTitle from '@/components/appTitle';
import ReverseETLTable from '@/components/tables/reverseETLTable';
import AddNewReverseETLProcess from '@/components/reverse-etl-setup/addNewReverseETLProcess';

export default function ReverseETLPage() {
  return (
    <>
      <AppTitle title='Reverse ETL syncs' />
      <AddNewReverseETLProcess />
      <ReverseETLTable
        processes={[
          {
            id: 1,
            name: 'Customer Data Sync',
            source: 'Salesforce',
            destination: 'BigQuery',
            status: 'active',
            details: [
              'Syncing customer data from Salesforce to BigQuery.',
              'Last sync: 2024-06-20 10:00 UTC',
              'Next sync scheduled: 2024-06-21 10:00 UTC',
            ],
          },
          {
            id: 2,
            name: 'Order Data Sync',
            source: 'UpCharge rents, users and venues',
            destination: 'Snowflake',
            status: 'inactive',
            details: [
              'Syncing order data from Shopify to Snowflake.',
              'Last sync: 2024-06-19 08:00 UTC',
              'Next sync scheduled: Not scheduled',
            ],
          },
          {
            id: 3,
            name: 'Loaction Data Sync',
            source: 'UpCharge locations',
            destination: 'Redshift',
            status: 'failed',
            details: [
              'Syncing marketing data from HubSpot to Redshift.',
              'Last sync: 2024-06-18 07:00 UTC',
              'Error: Network timeout during last sync.',
            ],
          },
          {
            id: 4,
            name: 'CRM leed sync',
            source: 'Restaurants in Finland',
            destination: 'PostgreSQL',
            status: 'active',
            details: [
              'Syncing product data from Magento to PostgreSQL.',
              'Last sync: 2024-06-20 12:00 UTC',
              'Next sync scheduled: 2024-06-21 12:00 UTC',
            ],
          },
        ]}
      />
    </>
  );
}
