"use client";

import React, { useState } from "react";

import ScriptEditor from "@/components/scriptEditor";
import QueryResultsAndTabs from "@/components/queryResultsAndTabs";
import { IoChevronBack } from "react-icons/io5";
import Link from "next/link";

export default function DataSetEditor() {
  const [editorHeight, setEditorHeight] = useState("400px");

  const dataSet = {
    id: 0,
    name: "UpCharge rents, users and venues",
    sourceWorkspace: "UpCharge",
    status: "private",
    parts: [
      "UpCharge venues with revenue, type, average rent cost and amount of daily rentals",
      "Venue performance by venue type",
      "Venue sales by partner",
      "All rentals with Stripe invoices",
    ],
  };
  return (
    <>
      <div className="flex justify-between p-2">
        <div className="flex justify-between px-4 py-2 text-sm xl:text-md">
          <div className="pr-10">
            <Link href={".."} title="Back">
              <IoChevronBack size={40} />
            </Link>
          </div>
          <div className="pr-10">
            {dataSet.name}
            <br />
            <span className="text-xs xl:text-sm text-ash_gray">
              {dataSet.sourceWorkspace}
            </span>
          </div>
          <div className="pr-10">
            {dataSet.status === "private" ? (
              <span className="block p-2 max-w-36 text-xs xl:text-base text-white text-center leading-6 bg-midnight_green rounded-full shadow-sm">
                Private
              </span>
            ) : dataSet.status === "public" ? (
              <span className="block p-2 max-w-36 text-xs xl:text-base text-white text-center leading-6 bg-ash_gray rounded-full shadow-sm">
                Public
              </span>
            ) : (
              <span className="block p-2 max-w-36 text-xs xl:text-base text-rich_black text-center leading-6 bg-beige rounded-full shadow-sm">
                Connected
              </span>
            )}
          </div>
        </div>
        <div className="px-4 py-2 text-right">
          <div className="flex space-x-2 float-right text-xs xl:text-base">
            <Link href="#" className="text-ash_gray hover:underline py-3 px-1">
              Logs
            </Link>
            {(dataSet.status === "private" || dataSet.status === "public") && (
              <>
                <Link
                  href="#"
                  className="text-ash_gray hover:underline py-3 px-1"
                >
                  Edit
                </Link>
                <Link
                  href="#"
                  className="text-ash_gray hover:underline py-3 px-1"
                >
                  Remove
                </Link>
              </>
            )}
            {dataSet.status === "connected" && (
              <>
                <Link
                  href="#"
                  className="text-ash_gray hover:underline py-3 px-1"
                >
                  View listing
                </Link>
                <Link
                  href="#"
                  className="text-ash_gray hover:underline py-3 px-1"
                >
                  Disconnect
                </Link>
              </>
            )}

            <div className="pl-2">
              {dataSet.status === "private" && (
                <Link
                  className="block py-2 px-5 mb-2 w-44 text-white text-center leading-6 bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
                  href="#"
                >
                  Publish data set
                </Link>
              )}
              {dataSet.status === "public" && (
                <Link
                  className="block py-2 px-5 mb-2 w-44 text-white text-center leading-6 bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
                  href="#"
                >
                  View listing
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex">
        <div className="bg-white -mr-4 inline-block w-full overflow-auto">
          <ScriptEditor
            editorHeight={editorHeight}
            setEditorHeight={setEditorHeight}
            hideTabs={true}
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
