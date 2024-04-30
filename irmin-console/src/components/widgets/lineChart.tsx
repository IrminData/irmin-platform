"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register the components required for the chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartProps {
  title: string;
  data: {
    labels: string[]; // x-axis labels e.g., ['January', 'February', 'March', ...]
    datasets: Array<{
      label: string; // Name of the dataset
      data: number[]; // Data points for the dataset
      fill: boolean; // Whether to fill the area under the line
      backgroundColor: string; // Color for the dataset
      borderColor: string; // Border color of the line
    }>;
  };
}

const LineChart: React.FC<ChartProps> = ({ title, data }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold leading-tight mb-6">{title}</h2>
      <div className="shadow rounded-lg overflow-hidden overflow-y-scroll px-2 pb-2">
        <Line
          data={data}
          options={{
            scales: {
              y: {
                beginAtZero: true,
              },
            },
            plugins: {
              legend: {
                display: true,
                position: "top",
              },
            },
            maintainAspectRatio: false,
          }}
          style={{ height: "400px", width: "100%", maxHeight: "400px" }}
        />
      </div>
    </div>
  );
};

export default LineChart;
