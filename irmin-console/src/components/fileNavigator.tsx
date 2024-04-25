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
  onOpenFile: (name: string) => void; // Callback function when a file is opened
  onDeleteFile?: (name: string) => void; // Callback function when a file is deleted
  onRenameFile?: (name: string) => void; // Callback function when a file is renamed
};

const FileNavigator: React.FC<FileNavigatorProps> = ({
  items,
  onOpenFile,
  onDeleteFile,
  onRenameFile,
}) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    itemName: string;
  }>({ visible: false, x: 0, y: 0, itemName: "" });

  const toggleFolder = (name: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleContextMenu = (event: React.MouseEvent, name: string) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      itemName: name,
    });
  };

  const handleClick = (event: React.MouseEvent, item: FileItemProps) => {
    setContextMenu((prev) => ({
      ...prev,
      visible: false,
    }));
    if (item.type === "file") {
      onOpenFile(item.name);
    } else {
      toggleFolder(item.name);
    }
  };

  // Close context menu on click outside
  const handleClickOutside = () => {
    setContextMenu((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  const renderItems = (items: FileItemProps[]) => {
    return items.map((item) => (
      <div
        key={item.name}
        className="my-1"
        onContextMenu={(e) => handleContextMenu(e, item.name)}
      >
        <div
          className={`flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded-md`}
          onClick={(e) => handleClick(e, item)}
        >
          {item.type === "folder" ? (
            openFolders[item.name] ? (
              <FiChevronDown className="inline-block" />
            ) : (
              <FiChevronRight className="inline-block" />
            )
          ) : null}
          <span className="ml-2">
            {item.type === "folder" ? <FiFolder /> : <FiFileText />}
          </span>
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
      <div className="px-3">
        <button className="text-center hover:underline transition-all mb-2">
          <FiPlus className="inline-block mr-2 -mt-1 text-ash_gray" /> Create
          new file or folder
        </button>
      </div>
      <div className="fileNavigator px-3" onClick={handleClickOutside}>
        {renderItems(items)}
      </div>
      {contextMenu.visible && (
        <ul
          className="absolute bg-white shadow rounded p-2"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <li
            className="cursor-pointer hover:bg-gray-100 p-1"
            onClick={() => onOpenFile(contextMenu.itemName)}
          >
            Open
          </li>
          <li
            className="cursor-pointer hover:bg-gray-100 p-1"
            onClick={() => onDeleteFile && onDeleteFile(contextMenu.itemName)}
          >
            Delete
          </li>
          <li
            className="cursor-pointer hover:bg-gray-100 p-1"
            onClick={() => onRenameFile && onRenameFile(contextMenu.itemName)}
          >
            Rename
          </li>
        </ul>
      )}
    </>
  );
};

export default FileNavigator;
