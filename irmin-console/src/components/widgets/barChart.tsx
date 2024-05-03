"use client";

import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { IoSettings } from "react-icons/io5";

// Register the components required for the chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
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
      backgroundColor: string; // Color for the dataset
      borderColor?: string; // Border color of the bar (optional)
    }>;
  };
}

const BarChart: React.FC<ChartProps> = ({ title, data }) => {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center px-6 py-4 border-b h-14">
        <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        <button
          className="text-gray-200 hover:text-ash_gray-600 transition duration-300"
          onClick={() => {
            // TODO: Implement settings modal
          }}
        >
          <IoSettings size={20} />
        </button>
      </div>
      <div className="shadow rounded-lg overflow-hidden overflow-y-scroll px-2 pb-2">
        <Bar
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

export default BarChart;
