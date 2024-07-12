'use client';

import React, { useState } from 'react';

import { IoAdd, IoClose, IoSave } from 'react-icons/io5';

import Button from '@/components/misc/Button';
import ScriptEditor from '@/components/script-editor/scriptEditor';
import ScriptEditorNew from '@/components/script-editor/scriptEditorNew';

import { useLocale } from '@/context/LocaleContext';

const ScriptEditorWithOptions = ({
  editorHeight,
  setEditorHeight,
}: {
  editorHeight: string;
  setEditorHeight: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { dict } = useLocale();
  const [activeLanguage, setActiveLanguage] = useState<'sql' | 'js' | 'python'>(
    'sql'
  );
  const [tabs, setTabs] = useState<
    Array<{
      name: string;
      content: string;
      changed: boolean;
      type: 'sql' | 'js' | 'python';
    }>
  >([
    {
      name: 'Query 1',
      changed: false,
      type: activeLanguage,
      content:
        activeLanguage === 'sql'
          ? `SELECT ProductID, OrderQty, SUM(LineTotal) AS Total\nFROM Sales.SalesOrderDetail\nWHERE UnitPrice < $5.00\nGROUP BY ProductID, OrderQty\nORDER BY ProductID, OrderQty\nOPTION (HASH GROUP, FAST 10);`
          : activeLanguage === 'js'
            ? `console.log('Hello, World!')`
            : `import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt`,
    },
  ]);
  const [activeTab, setActiveTab] = useState<number>(0);

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
                activeTab === index ? 'border-b-2 border-irmin_green' : ''
              } `}
            >
              <Button
                variant='link'
                colorScheme='black'
                className={`min-w-40 px-4 py-2`}
                onClick={() => selectTab(index)}
                ariaLabel={`Select tab ${tab.name}`}
              >
                {tab.name}
              </Button>
              <Button
                variant='icon'
                colorScheme='black'
                className={`border-none px-2 py-2`}
                onClick={() => closeTab(index)}
                ariaLabel={`Close tab ${tab.name}`}
              >
                <IoClose />
              </Button>
            </div>
          ))}
          {tabs.length > 0 && (
            <Button
              variant='icon'
              colorScheme='black'
              onClick={addNewTab}
              ariaLabel='Add new tab'
            >
              <IoAdd />
            </Button>
          )}
        </div>
        <div className='p-2'>
          <select
            className='rounded-lg border-irmin_green px-2 py-2 text-xs text-irmin_blue transition-all hover:bg-irmin_green-800 focus:outline-none xl:text-base'
            onChange={(e) => {
              if (!tabs[activeTab].changed) {
                const newTabs = [...tabs];
                newTabs[activeTab] = {
                  ...newTabs[activeTab],
                  type: e.target.value as 'sql' | 'python' | 'js',
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
            <option value={'js'}>JavaScript</option>
            <option value={'python'}>Python</option>
          </select>
        </div>
        <div className='p-2 xl:pr-8'>
          <Button
            size='md'
            variant='solid'
            colorScheme='primary'
            onClick={() => saveTabAsFile(activeTab)}
          >
            <IoSave className='mr-2 inline-block' /> {dict.editor.saveFile}
          </Button>
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
