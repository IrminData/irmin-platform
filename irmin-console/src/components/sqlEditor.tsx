"use client";

import React, { useState, useCallback, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { IoClose, IoSave } from "react-icons/io5";
import SQLEditorNew from "./sqlEditorNew";

const SqlEditor = () => {
  const [tabs, setTabs] = useState<Array<{ name: string; content: string }>>([
    {
      name: "Query 1",
      content: `
      SELECT ProductID, OrderQty, SUM(LineTotal) AS Total
      FROM Sales.SalesOrderDetail
      WHERE UnitPrice < $5.00
      GROUP BY ProductID, OrderQty
      ORDER BY ProductID, OrderQty
      OPTION (HASH GROUP, FAST 10);
      `,
    },
  ]);
  const [activeTab, setActiveTab] = useState<number>(0);

  const [editorHeight, setEditorHeight] = useState("400px");

  // This callback uses `useCallback` hook to memoize the function so that it doesn't get
  // recreated on every render unless `setEditorHeight` changes, which should be never.
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Calculate and update the height of the editor
      const offsetTop =
        typeof editorRef?.current?.offsetTop === "number"
          ? editorRef.current.offsetTop
          : 0;
      setEditorHeight(`${e.clientY - offsetTop}px`);
    },
    [setEditorHeight]
  );

  // Reference to the editor div
  const editorRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    // Remove the event listeners when the mouse button is released
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Add mousemove and mouseup listeners to the document
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    // Prevent default action (e.g., text selection)
    e.preventDefault();
  };

  // Function to update the content of a tab
  const updateTabContent = (index: number, content: string) => {
    const newTabs = [...tabs];
    newTabs[index] = { ...newTabs[index], content };
    setTabs(newTabs);
  };

  // Function to add a new tab
  const addNewTab = () => {
    const newTabName = `Draft`;
    setTabs([...tabs, { name: newTabName, content: "" }]);
    setActiveTab(tabs.length);
  };

  // Function to select a tab
  const selectTab = (index: number) => {
    setActiveTab(index);
  };

  // Function to close a tab
  const closeTab = (index: number) => {
    // Create a new array that filters out the tab at the given index
    const newTabs = tabs.filter((_, tabIndex) => tabIndex !== index);
    setTabs(newTabs);

    // Adjust the activeTab index
    setActiveTab((prevActiveTab) => {
      // If the closing tab is to the left of the active tab, or is the active tab itself,
      // shift the activeTab index left. Otherwise, leave it as is.
      if (
        index < prevActiveTab ||
        (index === prevActiveTab && prevActiveTab === tabs.length - 1)
      ) {
        return Math.max(prevActiveTab - 1, 0);
      }
      return prevActiveTab;
    });
  };

  // Function to save the content of a tab as a .sql file
  const saveTabAsFile = (index: number) => {
    const tab = tabs[index];
    console.log("Save tab as file", tab.name, tab.content);
  };

  return (
    <div className="sqlEditor">
      <div className="flex mb-2 justify-between">
        <div className="w-3/4 flex overflow-x-auto">
          {tabs.map((tab, index) => (
            <div
              key={index}
              className={`flex items-center ${
                activeTab === index ? "border-b-2 border-ash_gray" : ""
              } `}
            >
              <button
                onClick={() => selectTab(index)}
                className={`min-w-40 px-4 py-2 focus:outline-none`}
              >
                {tab.name}
              </button>
              <button
                onClick={() => closeTab(index)}
                className={`px-2 py-2 focus:outline-none`}
              >
                <IoClose />
              </button>
            </div>
          ))}
          {tabs.length > 0 && (
            <button
              onClick={addNewTab}
              className="px-4 py-2 focus:outline-none"
            >
              +
            </button>
          )}
        </div>
        <div className="p-2 pr-8">
          <button
            onClick={() => saveTabAsFile(activeTab)}
            className="px-4 py-2 focus:outline-none bg-ash_gray text-white hover:bg-ash_gray-800 rounded-md transition-all"
          >
            <IoSave className="mr-2 inline-block" /> Save file
          </button>
        </div>
      </div>
      {tabs.length > 0 ? (
        <>
          <CodeMirror
            value={tabs[activeTab].content ?? ""}
            height={editorHeight}
            extensions={[sql()]}
            placeholder="Write your SQL query here..."
            onChange={(value, viewUpdate) => {
              updateTabContent(activeTab, value);
            }}
          />
          {/* The resizer element */}
          <div
            className="resizer cursor-ns-resize h-2 bg-gray-200"
            onMouseDown={handleMouseDown}
          ></div>
        </>
      ) : (
        <SQLEditorNew addNewTab={addNewTab} />
      )}
    </div>
  );
};

export default SqlEditor;
