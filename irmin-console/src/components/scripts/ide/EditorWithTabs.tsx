'use client';

import { IoAdd, IoClose, IoSave } from 'react-icons/io5';

import SqlHelper from '@/components/query/helper/SqlHelper';
import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { useScriptEditor } from '@/context/ScriptEditorContext';

import NewTabContent from './NewTabContent';
import ResizableCodeEditor from './ResizableCodeEditor';

/**
 * File editor UI with tabs
 * Shows a tabbed editor with multiple tabs
 * Uses {@link ResizableCodeEditor} to render the editor
 * Uses {@link NewTabContent} when starting a new tab
 */
const EditorWithTabs = () => {
  const {
    openTabs,
    activeTab,
    updateCurrentTabContent,
    setEditorHeight,
    setActiveTab,
    saveCurrentTab,
    closeTab,
    changeLanguage,
    openNewTab,
    editorHeight,
    enableSaveButton,
    currentTab,
  } = useScriptEditor();

  const { dict } = useLocale();

  return (
    <>
      {openTabs.length > 0 && (
        <div
          className={`
            mb-0 flex items-center justify-between gap-1 border-b
            border-gray-200 pr-2 pb-0
            dark:border-gray-800
          `}
        >
          <div
            className={`scrollbar-hide flex h-full items-center overflow-x-auto`}
          >
            {openTabs.map((tab, index) => (
              <div
                key={tab.id}
                className={`
                  flex h-full w-40 items-center justify-between
                  ${activeTab === index ? 'border-b-2 border-accent' : ''}
                `}
              >
                <button
                  type='button'
                  className={`
                    scrollbar-hide max-w-32 min-w-20 overflow-x-scroll px-2 py-1
                    text-sm whitespace-nowrap
                    hover:no-underline
                  `}
                  onClick={() => setActiveTab(index)}
                >
                  {tab.name || 'Untitled'}
                </button>
                <button
                  type='button'
                  className={`
                    cursor-pointer border-none p-1
                    hover:opacity-70
                  `}
                  onClick={() => closeTab(tab.id)}
                >
                  <IoClose size={12} />
                </button>
              </div>
            ))}
            <button
              type='button'
              className={`
                cursor-pointer rounded-md border-none p-2
                hover:bg-gray-100
                dark:hover:bg-gray-800
              `}
              onClick={openNewTab}
            >
              <IoAdd size={16} />
            </button>
          </div>
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-2'>
              <select
                id='language-select'
                value={currentTab?.language || 'go'}
                onChange={(e) => changeLanguage(e.target.value)}
                disabled={currentTab?.isSaved}
                className={`
                  w-24 rounded-md border bg-background px-2 py-1 text-sm
                  disabled:opacity-50
                  dark:border-gray-700
                `}
              >
                <option value='go'>Go</option>
              </select>
            </div>
            <SqlHelper />
            <Button
              onClick={saveCurrentTab}
              variant='default'
              size='sm'
              icon={<IoSave />}
              disabled={!enableSaveButton}
            >
              {dict.common.save}
            </Button>
          </div>
        </div>
      )}

      {openTabs.length === 0 ? (
        <NewTabContent addNewTab={openNewTab} />
      ) : (
        <>
          <ResizableCodeEditor
            content={currentTab?.content || ''}
            updateTabContent={updateCurrentTabContent}
            language={currentTab?.language || 'go'}
            editorHeight={editorHeight}
            setEditorHeight={setEditorHeight}
          />
        </>
      )}
    </>
  );
};

export default EditorWithTabs;
