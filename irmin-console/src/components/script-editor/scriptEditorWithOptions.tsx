'use client';

import React, { useState } from 'react';
import { IoClose, IoSave } from 'react-icons/io5';
import ScriptEditor from '@/components/script-editor/scriptEditor';
import ScriptEditorNew from '@/components/script-editor/scriptEditorNew';

const ScriptEditorWithOptions = ({
  editorHeight,
  setEditorHeight,
}: {
  editorHeight: string;
  setEditorHeight: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const [activeLanguage, setActiveLanguage] = useState<'sql' | 'python'>('sql');
  const [tabs, setTabs] = useState<
    Array<{
      name: string;
      content: string;
      changed: boolean;
      type: 'sql' | 'python';
    }>
  >([
    {
      name: 'Query 1',
      changed: false,
      type: activeLanguage,
      content:
        activeLanguage === 'sql'
          ? `SELECT ProductID, OrderQty, SUM(LineTotal) AS Total\nFROM Sales.SalesOrderDetail\nWHERE UnitPrice < $5.00\nGROUP BY ProductID, OrderQty\nORDER BY ProductID, OrderQty\nOPTION (HASH GROUP, FAST 10);`
          : `import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt`,
    },
  ]);
  const [activeTab, setActiveTab] = useState<number>(0);

  const updateTabContent = (index: number, content: string) => {
    const newTabs = [...tabs];
    newTabs[index] = { ...newTabs[index], content, changed: true };
    setTabs(newTabs);
  };

  const addNewTab = () => {
    const newTabName = `Draft`;
    setTabs([
      ...tabs,
      { name: newTabName, content: '', changed: false, type: activeLanguage },
    ]);
    setActiveTab(tabs.length);
  };

  const selectTab = (index: number) => {
    setActiveLanguage(tabs[index].type);
    setActiveTab(index);
  };

  const closeTab = (index: number) => {
    const newTabs = tabs.filter((_, tabIndex) => tabIndex !== index);
    setTabs(newTabs);

    setActiveTab((prevActiveTab) => {
      if (
        index < prevActiveTab ||
        (index === prevActiveTab && prevActiveTab === tabs.length - 1)
      ) {
        return Math.max(prevActiveTab - 1, 0);
      }
      return prevActiveTab;
    });
  };

  const saveTabAsFile = (index: number) => {
    const tab = tabs[index];
    console.log('Save tab as file', tab.name, tab.content);
  };

  return (
    <div className='sqlEditor'>
      <div className='algin-center mb-2 flex justify-between'>
        <div className='flex w-1/2 overflow-x-auto xl:w-3/4'>
          {tabs.map((tab, index) => (
            <div
              key={index}
              className={`flex h-fit items-center ${
                activeTab === index ? 'border-b-2 border-ash_gray' : ''
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
              className='h-fit px-4 py-2 focus:outline-none'
            >
              +
            </button>
          )}
        </div>
        <div className='p-2'>
          <select
            className='rounded-md border-ash_gray px-2 py-2 text-xs text-midnight_green transition-all hover:bg-ash_gray-800 focus:outline-none xl:text-base'
            onChange={(e) => {
              if (!tabs[activeTab].changed) {
                const newTabs = [...tabs];
                newTabs[activeTab] = {
                  ...newTabs[activeTab],
                  type: e.target.value as 'sql' | 'python',
                  content:
                    e.target.value === 'sql'
                      ? `SELECT ProductID, OrderQty, SUM(LineTotal) AS Total\nFROM Sales.SalesOrderDetail\nWHERE UnitPrice < $5.00\nGROUP BY ProductID, OrderQty\nORDER BY ProductID, OrderQty\nOPTION (HASH GROUP, FAST 10);`
                      : `import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt`,
                };
                setTabs(newTabs);
              }
              setActiveLanguage(e.target.value as 'sql' | 'python');
            }}
          >
            <option value={'sql'}>SQL</option>
            <option value={'python'}>Python</option>
          </select>
        </div>
        <div className='p-2 xl:pr-8'>
          <button
            onClick={() => saveTabAsFile(activeTab)}
            className='rounded-md bg-ash_gray px-2 py-2 text-xs text-white transition-all hover:bg-ash_gray-800 focus:outline-none xl:text-base'
          >
            <IoSave className='mr-2 inline-block' /> Save file
          </button>
        </div>
      </div>

      {tabs.length > 0 ? (
        <ScriptEditor
          content={tabs[activeTab].content}
          language={tabs[activeTab].type}
          editorHeight={editorHeight}
          setEditorHeight={setEditorHeight}
        />
      ) : (
        <ScriptEditorNew addNewTab={addNewTab} />
      )}
    </div>
  );
};

export default ScriptEditorWithOptions;
