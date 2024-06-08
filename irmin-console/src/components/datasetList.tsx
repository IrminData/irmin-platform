"use client";

import Link from "next/link";
import React from "react";

interface DataSet {
  id: number;
  name: string;
  sourceWorkspace: string;
  status: "private" | "public" | "connected";
}

interface DataSetListProps {
  dataSets: DataSet[];
  inSidebar?: boolean;
}

const DataSetList: React.FC<DataSetListProps> = ({
  dataSets,
  inSidebar = false,
}) => {
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
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 font-medium text-right text-xs xl:text-sm"
                >
                  Actions
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {dataSets.map((dataSet, index) => (
              <>
                <tr key={index}>
                  <td className="px-4 py-2 text-sm xl:text-md min-w-44">
                    {dataSet.name}
                    <br />
                    <span className="text-xs xl:text-sm text-ash_gray">
                      {dataSet.sourceWorkspace}
                    </span>
                  </td>
                  {!inSidebar ? (
                    <>
                      <td className="px-4 py-2">
                        {dataSet.status === "private" ? (
                          <span className="block py-1 px-1 max-w-36 text-xs xl:text-base text-white text-center leading-6 bg-midnight_green rounded-full shadow-sm">
                            Private
                          </span>
                        ) : dataSet.status === "public" ? (
                          <span className="block py-1 px-1 max-w-36 text-xs xl:text-base text-white text-center leading-6 bg-ash_gray rounded-full shadow-sm">
                            Public
                          </span>
                        ) : (
                          <span className="block py-1 px-1 max-w-36 text-xs xl:text-base text-rich_black text-center leading-6 bg-beige rounded-full shadow-sm">
                            Connected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex space-x-2 float-right text-xs xl:text-base">
                          <Link
                            href="#"
                            className="text-ash_gray hover:underline py-3 px-1"
                          >
                            Logs
                          </Link>
                          {(dataSet.status === "private" ||
                            dataSet.status === "public") && (
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
                            <Link
                              className="block py-2 px-5 mb-2 w-44 text-white text-center leading-6 bg-midnight_green hover:bg-midnight_green-600 focus:ring-2 focus:ring-midnight_green-500 focus:ring-opacity-50 rounded-full shadow-sm"
                              href={`data-sets/viewer/${dataSet.id}`}
                            >
                              View data set
                            </Link>
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
                      </td>
                    </>
                  ) : (
                    <></>
                  )}
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataSetList;
