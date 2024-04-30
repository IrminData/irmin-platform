"use client";

import React, { useState } from "react";

import SqlEditor from "@/components/sqlEditor";
import FileNavigator from "@/components/fileNavigator";
import QueryResultsAndTabs from "@/components/queryResultsAndTabs";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

export default function EditorPage() {
  const [editorHeight, setEditorHeight] = useState("400px");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <>
      <div className="flex">
        <div
          className={`editor-sidebar overflow-y-scroll bg-gray-50 -ml-4 inline-block ${
            !sidebarOpen ? "w-10" : "absolute z-10 w-80"
          } xl:w-80`}
          style={{
            height: "calc(100vh - 94px)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="px-1 py-1 focus:outline-none text-xl block xl:hidden"
          >
            {sidebarOpen ? (
              <IoChevronBack className="mr-2 inline-block w-full" />
            ) : (
              <IoChevronForward className="mr-2 inline-block w-full" />
            )}
          </button>
          <div className={`${!sidebarOpen ? "hidden" : "block w-80"} xl:block`}>
            <form className="w-full  p-3">
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <svg
                    className="w-3 h-3 text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 20"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                    />
                  </svg>
                </div>
                <input
                  type="search"
                  id="default-search"
                  className="block w-full p-2 ps-7 text-xs text-gray-900 border border-gray-300 rounded-full bg-gray-50"
                  placeholder="Search for files and folders"
                  required
                />
                <button
                  type="submit"
                  className="text-white absolute end-1.5 bottom-1.5 text-xs bg-ash_gray hover:bg-ash_gray-800 font-light rounded-full px-2 py-1"
                >
                  Search
                </button>
              </div>
            </form>
            <br />
            <FileNavigator
              onOpenFile={(name) => {
                console.log("Open file", name);
              }}
              items={[
                {
                  name: "ecommerce",
                  type: "folder",
                  children: [
                    { name: "customer_growth", type: "file" },
                    { name: "customer_retention", type: "file" },
                    { name: "customer_acquisition", type: "file" },
                    {
                      name: "inventory",
                      type: "folder",
                      children: [
                        { name: "stock_level", type: "file" },
                        { name: "stock_turnover", type: "file" },
                      ],
                    },
                  ],
                },
                {
                  name: "finance",
                  type: "folder",
                  children: [
                    { name: "cash_flow", type: "file" },
                    { name: "profit_margin", type: "file" },
                    { name: "revenue", type: "file" },
                  ],
                },
                {
                  name: "marketing",
                  type: "folder",
                  children: [
                    { name: "customer_growth", type: "file" },
                    { name: "customer_retention", type: "file" },
                    { name: "customer_acquisition", type: "file" },
                  ],
                },
                {
                  name: "sales",
                  type: "folder",
                  children: [
                    { name: "customer_growth", type: "file" },
                    { name: "customer_retention", type: "file" },
                    { name: "customer_acquisition", type: "file" },
                  ],
                },
              ]}
            />
          </div>
        </div>
        <div className="bg-white -mr-4 inline-block w-full overflow-auto">
          <SqlEditor
            editorHeight={editorHeight}
            setEditorHeight={setEditorHeight}
          />
          <QueryResultsAndTabs
            editorHeight={editorHeight}
            columns={[
              {
                name: "Title",
                selector: (row: any) => row.title,
                sortable: true,
              },
              {
                name: "Year",
                selector: (row: any) => row.year,
                sortable: true,
              },
            ]}
            data={[
              {
                id: 1,
                title: "Beetlejuice",
                year: "1988",
              },
              {
                id: 2,
                title: "Ghostbusters",
                year: "1984",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
