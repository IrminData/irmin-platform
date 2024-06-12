import React from "react";
import { TbChevronDown } from "react-icons/tb";

interface DashboardTitleAndSelectorProps {
  title: string;
  options: string[];
  selected: string;
  onSelectionChange: (selection: string) => void;
}

const DashboardTitleAndSelector: React.FC<DashboardTitleAndSelectorProps> = ({
  title,
  options,
  selected,
  onSelectionChange,
}) => {
  return (
    <div className="flex items-center justify-between p-4">
      <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onSelectionChange(e.target.value)}
          className="block appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
        >
          {options.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <TbChevronDown className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

export default DashboardTitleAndSelector;
