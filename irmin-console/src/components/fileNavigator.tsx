"use client";

import React, { useState } from "react";
import {
  FiFolder,
  FiFileText,
  FiChevronDown,
  FiChevronRight,
  FiPlus,
} from "react-icons/fi";

type FileItemProps = {
  name: string;
  type: "file" | "folder";
  children?: FileItemProps[];
};

type FileNavigatorProps = {
  items: FileItemProps[];
};

const FileNavigator: React.FC<FileNavigatorProps> = ({ items }) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (name: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const renderItems = (items: FileItemProps[]) => {
    return items.map((item) => (
      <div key={item.name} className="my-2">
        <div
          className={`flex items-center ${
            item.type === "folder" ? "cursor-pointer" : ""
          }`}
          onClick={() => item.type === "folder" && toggleFolder(item.name)}
        >
          {item.type === "folder" ? (
            openFolders[item.name] ? (
              <FiChevronDown className="inline-block" />
            ) : (
              <FiChevronRight className="inline-block" />
            )
          ) : null}
          {item.type === "folder" ? (
            <FiFolder className="inline-block ml-2" />
          ) : (
            <FiFileText className="inline-block ml-2" />
          )}
          <span className="ml-2">{item.name}</span>
        </div>
        {item.type === "folder" && openFolders[item.name] && (
          <div className="pl-6">{renderItems(item.children ?? [])}</div>
        )}
      </div>
    ));
  };

  return (
    <>
      <button className="text-center hover:underline transition-all mb-2">
        <FiPlus className="inline-block mr-2 -mt-1 text-ash_gray" /> Create new
        file or folder
      </button>
      <div className="fileNavigator">{renderItems(items)}</div>
    </>
  );
};

export default FileNavigator;
