"use client";

import React, { useState } from "react";

import ScriptEditor from "@/components/scriptEditor";
import FileNavigator from "@/components/fileNavigator";
import QueryResultsAndTabs from "@/components/queryResultsAndTabs";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import DataSourceList from "@/components/dataSourceList";
import DataSetList from "@/components/dataSetList";
import { TbSearch } from "react-icons/tb";

export default function EditorPage() {
  const [editorHeight, setEditorHeight] = useState("400px");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <>
      <div className="flex">
        <div
          className={`editor-sidebar overflow-y-scroll bg-gray-50 -ml-4 inline-block ${
            !sidebarOpen ? "w-10" : "absolute z-10 w-96"
          } xl:w-96`}
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
          <div className={`${!sidebarOpen ? "hidden" : "block w-96"} xl:block`}>
            <form className="w-full p-3">
              <div className="relative">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <TbSearch className="w-4 h-4 text-gray-500" />
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
            <br />
            <div className="p-2 border-t max-h-80 overflow-auto">
              <h3 className="px-4">Connections</h3>
              <DataSourceList
                inSidebar={true}
                dataSources={[
                  {
                    id: 0,
                    name: "ExampleAnalyticsSync1",
                    connector: "Google Analytics",
                    nextSync: "in 3 hours",
                    nextSyncTimestamp: new Date(),
                    status: "running",
                    parts: [
                      "audience_overview",
                      "traffic_sources",
                      "content_overview",
                      "events",
                      "ecommerce",
                    ],
                  },
                  {
                    id: 1,
                    name: "Main Ads account sync",
                    connector: "Google AdSense",
                    nextSync: "in 8 hours",
                    nextSyncTimestamp: new Date(),
                    status: "errors",
                    parts: [
                      "ad_units",
                      "ad_units_performance",
                      "ad_units_performance_by_country",
                      "ad_units_performance_by_device",
                      "ad_units_performance_by_ad_size",
                    ],
                  },
                  {
                    id: 2,
                    name: "App database",
                    connector: "MySQL",
                    nextSync: "in 10 minutes",
                    nextSyncTimestamp: new Date(),
                    status: "stopped",
                    parts: [
                      "users",
                      "orders",
                      "products",
                      "categories",
                      "reviews",
                    ],
                  },
                  {
                    id: 3,
                    name: "Main Meta ads",
                    connector: "Facebook Ads",
                    nextSync: "in 30 minutes",
                    nextSyncTimestamp: new Date(),
                    status: "running",
                    parts: [
                      "ad_units",
                      "ad_units_performance",
                      "ad_units_performance_by_country",
                      "ad_units_performance_by_device",
                      "ad_units_performance_by_ad_size",
                    ],
                  },
                ]}
              />
            </div>
            <br />
            <div className="p-2 border-t max-h-80 overflow-auto">
              <h3 className="px-4">Data sets</h3>
              <DataSetList
                inSidebar={true}
                dataSets={[
                  {
                    id: 0,
                    name: "UpCharge rents, users and venues",
                    sourceWorkspace: "UpCharge",
                    status: "private",
                  },
                  {
                    id: 1,
                    name: "UpCharge locations",
                    sourceWorkspace: "UpCharge",
                    status: "public",
                  },
                  {
                    id: 2,
                    name: "Restaurants in Finland",
                    sourceWorkspace: "TripAdvisor",
                    status: "connected",
                  },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="bg-white -mr-4 inline-block w-full overflow-auto">
          <ScriptEditor
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
              {
                id: 3,
                title: "The Shining",
                year: "1980",
              },
              {
                id: 4,
                title: "The Conjuring",
                year: "2013",
              },
              {
                id: 5,
                title: "The Thing",
                year: "1982",
              },
              {
                id: 6,
                title: "The Others",
                year: "2001",
              },
              {
                id: 7,
                title: "Coraline",
                year: "2009",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
