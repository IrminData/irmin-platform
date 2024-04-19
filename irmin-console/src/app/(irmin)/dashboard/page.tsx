import BarChart from "@/components/widgets/barChart";
import LineChart from "@/components/widgets/lineChart";
import ScrollableTable from "@/components/widgets/scrollableTable";

export default function DashboardHome() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <ScrollableTable
          title="Monthly Sales"
          columns={[
            { header: "Month", accessor: "month" },
            { header: "Total Sales", accessor: "total_sales" },
          ]}
          data={[
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
          ]}
        />
        <ScrollableTable
          title="Monthly Sales"
          columns={[
            { header: "Month", accessor: "month" },
            { header: "Total Sales", accessor: "total_sales" },
          ]}
          data={[
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
            { month: "2020-12-01", total_sales: 5168 },
            { month: "2021-01-01", total_sales: 7661 },
          ]}
        />
        <LineChart
          title="Monthly Sales"
          data={{
            labels: ["January", "February", "March", "April"],
            datasets: [
              {
                label: "Sales",
                data: [65, 59, 80, 81],
                fill: false,
                backgroundColor: "#aec3b0",
                borderColor: "#aec3b0",
              },
            ],
          }}
        />
        <BarChart
          title="Monthly Sales"
          data={{
            labels: ["January", "February", "March", "April"],
            datasets: [
              {
                label: "Sales",
                data: [65, 59, 80, 81],
                backgroundColor: "#aec3b0",
                borderColor: "#aec3b0",
              },
            ],
          }}
        />
      </div>
    </>
  );
}
