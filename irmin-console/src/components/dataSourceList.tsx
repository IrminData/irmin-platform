"use client";

import React, { useState } from "react";

interface DataSource {
  id: number;
  name: string;
  connector: string;
  nextSync: string;
  nextSyncTimestamp: Date;
  status: "running" | "errors" | "stopped";
}

interface DataSourceListProps {
  dataSources: DataSource[];
}

const DataSourceList: React.FC<DataSourceListProps> = ({ dataSources }) => {
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});

  return (
    <div className="py-8">
      <div className="overflow-x-auto">
        <table className="w-full text-base text-left text-rich_black font-light">
          <thead className="text-md uppercase border-b-4 border-ash_gray">
            <tr>
              <th scope="col" className="px-6 py-3  font-medium">
                Name
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Next sync
              </th>
              <th scope="col" className="px-6 py-3  font-medium">
                Status
              </th>
              <th scope="col" className="px-6 py-3  font-medium text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {dataSources.map((dataSource, index) => (
              <tr
                key={index}
                className={openRows[dataSource.id] ? "" : "shadow"}
              >
                <td className="px-6 py-4 text-lg">
                  {dataSource.name}
                  <br />
                  <span className="text-sm text-ash_gray">
                    Connector: {dataSource.connector}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {dataSource.nextSync}
                  <br />
                  <span className="text-sm text-ash_gray">
                    {dataSource.nextSyncTimestamp.toUTCString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {dataSource.status === "errors" ? (
                    <span className="block py-2 px-2 max-w-36 text-base text-white text-center leading-6 bg-midnight_green rounded-full shadow-sm">
                      Errors
                    </span>
                  ) : dataSource.status === "running" ? (
                    <span className="block py-2 px-2 max-w-36 text-base text-white text-center leading-6 bg-ash_gray rounded-full shadow-sm">
                      Running
                    </span>
                  ) : (
                    <span className="block py-2 px-2 max-w-36 text-base text-rich_black text-center leading-6 bg-beige rounded-full shadow-sm">
                      Stopped
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex space-x-2 float-right">
                    <a
                      href="#"
                      className="text-ash_gray hover:underline py-3 px-1"
                    >
                      Logs
                    </a>
                    <a
                      href="#"
                      className="text-ash_gray hover:underline py-3 px-1"
                    >
                      Edit
                    </a>
                    <a
                      href="#"
                      className="text-ash_gray hover:underline py-3 px-1"
                    >
                      Remove
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataSourceList;
