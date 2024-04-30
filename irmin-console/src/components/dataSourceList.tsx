"use client";

import Link from "next/link";
import React, { useState } from "react";
import { IoChevronDownOutline, IoChevronUpOutline } from "react-icons/io5";

interface DataSource {
  id: number;
  name: string;
  connector: string;
  nextSync: string;
  nextSyncTimestamp: Date;
  status: "running" | "errors" | "stopped";
  parts: string[];
}

interface DataSourceListProps {
  dataSources: DataSource[];
  inSidebar?: boolean;
}

const DataSourceList: React.FC<DataSourceListProps> = ({
  dataSources,
  inSidebar = false,
}) => {
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setOpenRows((prevOpenRows) => ({
      ...prevOpenRows,
      [id]: !prevOpenRows[id],
    }));
  };

  return (
    <div className="pb-8">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-rich_black font-light">
          {!inSidebar && (
            <thead className="text-md uppercase border-b-4 border-ash_gray">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-2 font-medium text-xs xl:text-sm"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 font-medium text-xs xl:text-sm"
                >
                  Next sync
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 font-medium text-xs xl:text-sm"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 font-medium text-xs xl:text-sm text-right"
                >
                  Actions
                </th>
              </tr>
            </thead>
          )}

          <tbody>
            {dataSources.map((dataSource, index) => (
              <>
                <tr key={index}>
                  <td className="px-4 py-2 text-sm xl:text-md min-w-44">
                    {dataSource.name}
                    <br />
                    <span className="text-xs text-ash_gray">
                      {dataSource.connector}
                    </span>
                  </td>
                  {!inSidebar ? (
                    <>
                      <td className="px-4 py-2 text-xs xl:text-base min-w-44">
                        {dataSource.nextSync}
                        <br />
                        <span className="text-ash_gray">
                          {dataSource.nextSyncTimestamp.toUTCString()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs xl:text-base">
                        {dataSource.status === "errors" ? (
                          <span className="block py-1 px-1 max-w-36 text-white text-center leading-6 bg-midnight_green rounded-full shadow-sm">
                            Errors
                          </span>
                        ) : dataSource.status === "running" ? (
                          <span className="block py-1 px-1 max-w-36 text-white text-center leading-6 bg-ash_gray rounded-full shadow-sm">
                            Running
                          </span>
                        ) : (
                          <span className="block py-1 px-1 max-w-36 text-rich_black text-center leading-6 bg-beige rounded-full shadow-sm">
                            Stopped
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-xs xl:text-base">
                        <div className="inline-flex space-x-2">
                          <Link
                            href="#"
                            className="text-ash_gray hover:underline py-3 px-1"
                          >
                            Logs
                          </Link>
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
                        </div>
                        <button
                          onClick={() => toggleRow(dataSource.id)}
                          className="text-ash_gray hover:text-ash_gray-800 focus:outline-none inline float-right mt-4 ml-4"
                        >
                          {openRows[dataSource.id] ? (
                            <IoChevronUpOutline className="w-5 h-5" />
                          ) : (
                            <IoChevronDownOutline className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-2 text-right text-xs xl:text-base">
                      <button
                        onClick={() => toggleRow(dataSource.id)}
                        className="text-ash_gray hover:text-ash_gray-800 focus:outline-none inline float-right mt-4 ml-4"
                      >
                        {openRows[dataSource.id] ? (
                          <IoChevronUpOutline className="w-5 h-5" />
                        ) : (
                          <IoChevronDownOutline className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  )}
                </tr>
                {openRows[dataSource.id] && (
                  <tr className="shadow">
                    <td colSpan={3} className="px-10 py-2">
                      <ul>
                        {dataSource.parts.map((part, index) => (
                          <li
                            key={index}
                            className="py-2 border-b border-color-ash_gray text-xs"
                          >
                            {part}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataSourceList;
