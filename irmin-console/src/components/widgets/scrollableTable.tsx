import React from "react";

interface Column {
  header: string;
  accessor: string; // Matches with keys in data
}

interface TableProps {
  title: string;
  columns: Column[];
  data: Record<string, any>[];
}

const ScrollableTable: React.FC<TableProps> = ({ title, columns, data }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold leading-tight">{title}</h2>
      <div className="mt-6">
        <div className="align-middle inline-block min-w-full shadow rounded-lg overflow-hidden overflow-y-scroll border-b border-gray-200 max-h-80">
          <table className="min-w-full">
            <thead className="bg-ash_gray sticky top-0">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 border-b border-gray-200 text-left text-xs leading-4 font-medium text-white uppercase tracking-wider"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white max-h-80">
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="h-12 text-sm leading-5 text-gray-900"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-6 py-4 whitespace-no-wrap border-b border-gray-200"
                    >
                      {row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScrollableTable;
