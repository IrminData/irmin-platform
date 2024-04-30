"use client";

import React, { useState } from "react";

import SqlEditor from "@/components/sqlEditor";
import FileNavigator from "@/components/fileNavigator";
import QueryResultsAndTabs from "@/components/queryResultsAndTabs";

export default function EditorPage() {
  const [editorHeight, setEditorHeight] = useState("400px");
  return (
    <>
      <div className="grid grid-cols-4">
        <div
          className="editor-sidebar col-span-1 h-screen overflow-y-scroll bg-gray-50 -ml-4"
          style={{
            height: "calc(100vh - 94px)",
          }}
        >
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
        <div className="bg-white col-span-3 -mr-4">
          <SqlEditor
            editorHeight={editorHeight}
            setEditorHeight={setEditorHeight}
          />
          <QueryResultsAndTabs
            editorHeight={editorHeight}
            columns={[
              {
                Header: "ID",
                accessor: "id",
              },
              {
                Header: "First Name",
                accessor: "firstName",
              },
              {
                Header: "Last Name",
                accessor: "lastName",
              },
              {
                Header: "Email",
                accessor: "email",
              },
              {
                Header: "Phone",
                accessor: "phone",
              },
              {
                Header: "Updated At",
                accessor: "updatedAt",
              },
              {
                Header: "Created At",
                accessor: "createdAt",
              },
            ]}
            data={[
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
              {
                id: "4877967652099",
                firstName: "Hewett",
                lastName: "Ardron",
                email: "hewett@example.com",
                phone: "748-763-0466",
                updatedAt: "2021-09-01T00:00:00Z",
                createdAt: "2021-08-01T00:00:00Z",
              },
              {
                id: "43137452640249",
                firstName: "Nata",
                lastName: "Kivits",
                email: "n.kivits@example.com",
                phone: "265-841-9808",
                updatedAt: "2021-11-01T00:00:00Z",
                createdAt: "2021-11-01T00:00:00Z",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
