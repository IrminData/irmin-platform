import AppTitle from "@/components/appTitle";
import DataSourceList from "@/components/dataSourceList";

export default function DataSourcesPage() {
  return (
    <>
      <AppTitle title="Data sources" />
      <DataSourceList
        dataSources={[
          {
            id: 0,
            name: "ExampleAnalyticsSync1",
            connector: "Google Analytics",
            nextSync: "in 3 hours",
            nextSyncTimestamp: new Date(),
            status: "running",
          },
          {
            id: 1,
            name: "Main Ads account sync",
            connector: "Google AdSense",
            nextSync: "in 8 hours",
            nextSyncTimestamp: new Date(),
            status: "errors",
          },
          {
            id: 2,
            name: "App database",
            connector: "MySQL",
            nextSync: "in 10 minutes",
            nextSyncTimestamp: new Date(),
            status: "stopped",
          },
          {
            id: 3,
            name: "Main Meta ads",
            connector: "Facebook Ads",
            nextSync: "in 30 minutes",
            nextSyncTimestamp: new Date(),
            status: "running",
          },
        ]}
      />
    </>
  );
}
