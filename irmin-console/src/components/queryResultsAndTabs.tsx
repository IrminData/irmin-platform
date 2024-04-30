"use client";

import React, { useEffect, useRef, useState } from "react";
import DataTable from "react-data-table-component";
import {
  AiOutlineSave,
  AiOutlineHistory,
  AiOutlineDownload,
} from "react-icons/ai";
import { MdPlayArrow } from "react-icons/md";

type DataTableProps = {
  editorHeight: string;
  data: any[];
  columns: any[];
};

const QueryResultsAndTabs: React.FC<DataTableProps> = ({
  editorHeight,
  data,
  columns,
}) => {
  const [activeTab, setActiveTab] = useState("queryResults");

  const tableRef = useRef<HTMLDivElement>(null);
  const [tableMaxHeight, setTableMaxHeight] = useState("0px");

  const updateTableHeight = () => {
    const rect = tableRef.current?.getBoundingClientRect();
    if (rect) {
      const offsetTop = rect.top + window.scrollY; // Distance from the top of the document to the element
      const windowHeight = window.innerHeight; // Height of the viewport
      const maxHeight = windowHeight - offsetTop; // Remaining height below the element
      setTableMaxHeight(`${maxHeight - 20}px`);
    }
  };

  useEffect(() => {
    updateTableHeight(); // Update on mount
    window.addEventListener("resize", updateTableHeight); // Update on window resize
    return () => window.removeEventListener("resize", updateTableHeight); // Cleanup on unmount
  }, [editorHeight]);

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
        <div style={{ height: tableMaxHeight }} className="overflow-auto">
          <textarea
            className="h-full w-full focus:outline-none p-2"
            placeholder="Start typing your documentation and notes here..."
          />
        </div>
      )}

      {/* Table (for the Query Results tab) */}
      {activeTab === "queryResults" && (
        <div
          ref={tableRef}
          style={{ maxHeight: tableMaxHeight }}
          className="overflow-auto"
        >
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
          <div className="overflow-auto">
            <DataTable columns={columns} data={data} />
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryResultsAndTabs;
