'use client';

import React, { useState, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { python } from '@codemirror/lang-python';
import { IoClose, IoSave } from 'react-icons/io5';
import ScriptEditorNew from './scriptEditorNew';

const ScriptEditor = ({
  editorHeight,
  setEditorHeight,
  hideTabs = false,
}: {
  editorHeight: string;
  setEditorHeight: (a: string) => void;
  hideTabs?: boolean;
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
          ? `SELECT ProductID, OrderQty, SUM(LineTotal) AS Total\FROM Sales.SalesOrderDetail\nWHERE UnitPrice < $5.00\nGROUP BY ProductID, OrderQty\nORDER BY ProductID, OrderQty\nOPTION (HASH GROUP, FAST 10);`
          : `import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt`,
    },
  ]);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Reference to the editor div
  const editorRef = useRef<HTMLDivElement>(null);

  // This callback uses `useCallback` hook to memoize the function so that it doesn't get
  // recreated on every render unless `setEditorHeight` changes, which should be never.
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Calculate and update the height of the editor
      const offsetTop =
        typeof editorRef?.current?.offsetTop === 'number'
          ? editorRef.current.offsetTop
          : 0;
      setEditorHeight(`${e.clientY - offsetTop}px`);
    },
    [setEditorHeight]
  );

  const handleMouseUp = useCallback(() => {
    // Remove the event listeners when the mouse button is released
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Add mousemove and mouseup listeners to the document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    // Prevent default action (e.g., text selection)
    e.preventDefault();
  };

  // Function to update the content of a tab
  const updateTabContent = (index: number, content: string) => {
    const newTabs = [...tabs];
    newTabs[index] = { ...newTabs[index], content, changed: true };
    setTabs(newTabs);
  };

  // Function to add a new tab
  const addNewTab = () => {
    const newTabName = `Draft`;
    setTabs([
      ...tabs,
      { name: newTabName, content: '', changed: false, type: activeLanguage },
    ]);
    setActiveTab(tabs.length);
  };

  // Function to select a tab
  const selectTab = (index: number) => {
    setActiveLanguage(tabs[index].type);
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
    console.log('Save tab as file', tab.name, tab.content);
  };

  return (
    <div className='sqlEditor'>
      {!hideTabs && (
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
                // If current tab has not been changed then set the value of the active tab to correspond with current language setting
                if (!tabs[activeTab].changed) {
                  const newTabs = [...tabs];
                  newTabs[activeTab] = {
                    ...newTabs[activeTab],
                    type: e.target.value as 'sql' | 'python',
                    content:
                      e.target.value === 'sql'
                        ? `SELECT ProductID, OrderQty, SUM(LineTotal) AS Total\FROM Sales.SalesOrderDetail\nWHERE UnitPrice < $5.00\nGROUP BY ProductID, OrderQty\nORDER BY ProductID, OrderQty\nOPTION (HASH GROUP, FAST 10);`
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
      )}

      <div style={{ minHeight: editorHeight }} ref={editorRef}>
        {tabs.length > 0 ? (
          <>
            {activeLanguage === 'sql' ? (
              <CodeMirror
                value={tabs[activeTab].content ?? ''}
                height={editorHeight}
                extensions={[sql()]}
                placeholder='Write your SQL query here...'
                onChange={(value, viewUpdate) => {
                  updateTabContent(activeTab, value);
                }}
              />
            ) : (
              <CodeMirror
                value={tabs[activeTab].content ?? ''}
                height={editorHeight}
                extensions={[python()]}
                placeholder='Write your Python script here...'
                onChange={(value, viewUpdate) => {
                  updateTabContent(activeTab, value);
                }}
              />
            )}
            {/* The resizer element */}
            <div
              className='resizer h-1 cursor-ns-resize bg-gray-200'
              onMouseDown={handleMouseDown}
            ></div>
          </>
        ) : (
          <ScriptEditorNew addNewTab={addNewTab} />
        )}
      </div>
    </div>
  );
};

export default ScriptEditor;
