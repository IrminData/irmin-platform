"use client";
import React, { useState } from "react";

const SqlEditor = () => {
  const [tabs, setTabs] = useState<Array<{ name: string; content: string }>>([
    { name: "Query 1", content: "" },
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
    <div className="container mx-auto p-4">
      <div className="flex mb-2">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => selectTab(index)}
            className={`px-4 py-2 ${
              activeTab === index ? "border-b-2 border-blue-500" : ""
            } focus:outline-none`}
          >
            {tab.name}
          </button>
        ))}
        <button onClick={addNewTab} className="px-4 py-2 focus:outline-none">
          +
        </button>
      </div>
      {/** TODO: Codemirror */}
    </div>
  );
};

export default SqlEditor;
