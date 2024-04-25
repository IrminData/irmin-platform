"use client";
import React, { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";

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

  const updateTabContent = (index: number, content: string) => {
    const newTabs = [...tabs];
    newTabs[index] = { ...newTabs[index], content };
    setTabs(newTabs);
  };

  const addNewTab = () => {
    const newTabName = `Query ${tabs.length + 1}`;
    setTabs([...tabs, { name: newTabName, content: "" }]);
    setActiveTab(tabs.length);
  };

  const selectTab = (index: number) => {
    setActiveTab(index);
  };

  return (
    <div className="sqlEditor">
      <div className="flex mb-2">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => selectTab(index)}
            className={`px-4 py-2 ${
              activeTab === index ? "border-b-2 border-ash_gray" : ""
            } focus:outline-none`}
          >
            {tab.name}
          </button>
        ))}
        <button onClick={addNewTab} className="px-4 py-2 focus:outline-none">
          +
        </button>
      </div>
      <CodeMirror
        value={tabs[activeTab].content}
        height="300px"
        extensions={[sql()]}
        placeholder="Write your SQL query here..."
        onChange={(value, viewUpdate) => {
          updateTabContent(activeTab, value);
        }}
      />
    </div>
  );
};

export default SqlEditor;
