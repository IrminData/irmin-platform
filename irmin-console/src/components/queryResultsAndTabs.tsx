"use client";

import React, { useState } from "react";
import { useTable } from "react-table";
import {
  AiOutlineSave,
  AiOutlineHistory,
  AiOutlineDownload,
} from "react-icons/ai";
import { MdPlayArrow } from "react-icons/md";

type DataTableProps = {
  data: any[];
  columns: any[];
};

const QueryResultsAndTabs: React.FC<DataTableProps> = ({ data, columns }) => {
  const [activeTab, setActiveTab] = useState("queryResults");
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({ columns, data });

  return (
    <div>
      {/* Tab Buttons */}
      <div className="flex mb-4 justify-between px-4 pt-2">
        <div>
          <button
            onClick={() => setActiveTab("queryResults")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "queryResults"
                ? "border-ash_gray"
                : "border-transparent"
            } focus:outline-none`}
          >
            Query Results
          </button>
          <button
            onClick={() => setActiveTab("visualization")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "visualization"
                ? "border-ash_gray"
                : "border-transparent"
            } focus:outline-none`}
          >
            Visualization
          </button>
          <button
            onClick={() => setActiveTab("documentation")}
            className={`px-4 py-2 border-b-2 ${
              activeTab === "documentation"
                ? "border-ash_gray"
                : "border-transparent"
            } focus:outline-none`}
          >
            Documentation
          </button>
        </div>
        <div>
          <button className="text-gray-800 py-2 px-4 border border-ash_gray rounded shadow focus:outline-none transition-all hover:bg-ash_gray hover:text-white">
            <AiOutlineSave className="inline" /> Save to dataset
          </button>
          <button className="text-gray-800 py-2 px-4 border border-ash_gray rounded shadow ml-2 focus:outline-none transition-all hover:bg-ash_gray hover:text-white">
            <MdPlayArrow className="inline" /> Run script
          </button>
        </div>
      </div>

      {activeTab === "visualization" && (
        <div>
          {/* Placeholder for Visualization content */}
          <p>Visualization content goes here...</p>
        </div>
      )}

      {activeTab === "documentation" && (
        <div>
          {/* Placeholder for Documentation content */}
          <p>Documentation content goes here...</p>
        </div>
      )}

      {/* Table (for the Query Results tab) */}
      {activeTab === "queryResults" && (
        <>
          {/* Action Buttons */}
          <div className="flex justify-between px-4 py-2 text-sm border">
            <div>
              <p className="inline font-bold">{"Unsaved draft (2)"}</p>
              <p className="inline font-light ml-4">
                {"99 rows returned in 1.5s"}
              </p>
            </div>
            <div>
              <button className="text-gray hover:underline">
                <AiOutlineDownload className="inline" /> export table (.csv)
              </button>
              <button className="text-gray ml-4 hover:underline">
                <AiOutlineHistory className="inline" /> execution history (2)
              </button>
            </div>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table
              {...getTableProps()}
              className="min-w-full divide-y divide-gray-200"
            >
              <thead className="bg-gray-50">
                {headerGroups.map((headerGroup) => (
                  <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map((column) => (
                      <th
                        {...column.getHeaderProps()}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.render("Header")}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody
                {...getTableBodyProps()}
                className="bg-white divide-y divide-gray-200"
              >
                {rows.map((row) => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()}>
                      {row.cells.map((cell) => {
                        return (
                          <td
                            {...cell.getCellProps()}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {cell.render("Cell")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default QueryResultsAndTabs;
