"use client";

import React from "react";
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
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({ columns, data });

  return (
    <div>
      {/* Tab Buttons */}
      <div className="flex justify-between mb-4">
        <div>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow">
            <AiOutlineSave className="inline" /> Save to dataset
          </button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow ml-2">
            <MdPlayArrow className="inline" /> Run script
          </button>
        </div>
        <div>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow">
            <AiOutlineDownload className="inline" /> export table (.csv)
          </button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow ml-2">
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
    </div>
  );
};

export default QueryResultsAndTabs;
