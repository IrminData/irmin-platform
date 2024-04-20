"use client";

import React, { useState } from "react";
import { IoChevronDownOutline, IoChevronUpOutline } from "react-icons/io5";

interface DataSet {
  id: number;
  name: string;
  sourceWorkspace: string;
  status: "private" | "public" | "connected";
  parts: string[];
}

interface DataSetListProps {
  dataSets: DataSet[];
}

const DataSetList: React.FC<DataSetListProps> = ({ dataSets }) => {
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setOpenRows((prevOpenRows) => ({
      ...prevOpenRows,
      [id]: !prevOpenRows[id],
    }));
  };

  return (
    <div className="py-8">
      <div className="overflow-x-auto">
        <table className="w-full text-base text-left text-rich_black font-light">
          <thead className="text-md uppercase border-b-4 border-ash_gray">
            <tr>
              <th scope="col" className="px-6 py-3  font-medium">
                Name
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
            {dataSets.map((dataset, index) => (
              <>
                <tr
                  key={index}
                  className={openRows[dataset.id] ? "" : "shadow"}
                >
                  <td className="px-6 py-4 text-lg">
                    {dataset.name}
                    <br />
                    <span className="text-sm text-ash_gray">
                      Source: {dataset.sourceWorkspace}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {dataset.status === "private" ? (
                      <span className="block py-2 px-2 max-w-36 text-base text-white text-center leading-6 bg-midnight_green rounded-full shadow-sm">
                        Private
                      </span>
                    ) : dataset.status === "public" ? (
                      <span className="block py-2 px-2 max-w-36 text-base text-white text-center leading-6 bg-ash_gray rounded-full shadow-sm">
                        Public
                      </span>
                    ) : (
                      <span className="block py-2 px-2 max-w-36 text-base text-rich_black text-center leading-6 bg-beige rounded-full shadow-sm">
                        Connected
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
                      {(dataset.status === "private" ||
                        dataset.status === "public") && (
                        <>
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
                        </>
                      )}
                      {dataset.status === "connected" && (
                        <>
                          <a
                            href="#"
                            className="text-ash_gray hover:underline py-3 px-1"
                          >
                            View listing
                          </a>
                          <a
                            href="#"
                            className="text-ash_gray hover:underline py-3 px-1"
                          >
                            Disconnect
                          </a>
                        </>
                      )}

                      <div className="pl-2">
                        <a
                          className="block py-2 px-5 mb-2 text-base w-44 text-white text-center leading-6 bg-midnight_green hover:bg-midnight_green-600 focus:ring-2 focus:ring-midnight_green-500 focus:ring-opacity-50 rounded-full shadow-sm"
                          href="#"
                        >
                          View data
                        </a>
                        {dataset.status === "private" && (
                          <a
                            className="block py-2 px-5 mb-2 text-base w-44 text-white text-center leading-6 bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
                            href="#"
                          >
                            Publish dataset
                          </a>
                        )}
                        {dataset.status === "public" && (
                          <a
                            className="block py-2 px-5 mb-2 text-base w-44 text-white text-center leading-6 bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
                            href="#"
                          >
                            View listing
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => toggleRow(dataset.id)}
                        className="text-ash_gray hover:text-ash_gray-800 focus:outline-none"
                      >
                        {openRows[dataset.id] ? (
                          <IoChevronUpOutline className="w-10 h-10" />
                        ) : (
                          <IoChevronDownOutline className="w-10 h-10" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
                {openRows[dataset.id] && (
                  <tr className="shadow">
                    <td colSpan={3} className="px-20 py-4">
                      <ul>
                        {dataset.parts.map((part, index) => (
                          <li
                            key={index}
                            className="py-3 border-b border-color-ash_gray"
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

export default DataSetList;
