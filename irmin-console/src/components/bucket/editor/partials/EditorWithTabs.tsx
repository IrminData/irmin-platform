'use client';

import React from 'react';

import ReactSelect from 'react-select';

import { IoAdd, IoClose, IoSave } from 'react-icons/io5';

import Button from '@/components/common/button/Button';

import { useEditor } from '@/context/EditorContext';
import { useLocale } from '@/context/LocaleContext';

import { irminFileTypes } from '@/types/api/Bucket';

import CodeEditor from './CodeEditor';
import NewTabContent from './NewTabContent';

/**
 * File editor UI with tabs
 * Shows a tabbed editor with multiple tabs
 * Uses {@link CodeEditor} for normal editor
 * Uses {@link NewTabContent} when starting a new tab
 */
const EditorWithTabs = () => {
  const {
    openFileTabs,
    activeTab,
    currentTabContent,
    setCurrentTabContent,
    setEditorHeight,
    setActiveTab,
    saveActiveTabAsFile,
    closeTab,
    changeLanguage,
    openNewTab,
    editorHeight,
    enableSaveButton,
    currentEditor,
    loadingEditorContent,
  } = useEditor();

  const { dict } = useLocale();

  return (
    <>
      {openFileTabs.length > 0 && (
        <div className='mb-0 flex items-center justify-between gap-1 border-b border-gray-200 pb-0 pr-2 dark:border-irmin_black'>
          <div className='scrollbar-hide flex items-center overflow-x-auto'>
            {openFileTabs.map((tab, index) => (
              <div
                key={index}
                className={`flex h-fit items-center ${
                  activeTab === index ? 'border-b-2 border-irmin_green' : ''
                } `}
              >
                <Button
                  size='sm'
                  variant='link'
                  colorScheme='black'
                  className={`min-w-20 px-2 py-1 hover:no-underline`}
                  onClick={() => setActiveTab(index)}
                  ariaLabel={`Switch to tab ${tab}`}
                >
                  {tab ?? 'Untitled'}
                </Button>
                <Button
                  size='sm'
                  variant='icon'
                  colorScheme='black'
                  className={`border-none px-1 py-1`}
                  onClick={() => closeTab(tab)}
                >
                  <IoClose size={12} />
                </Button>
              </div>
            ))}
            <Button
              variant='icon'
              size='sm'
              className={`border-none px-1 py-1`}
              colorScheme='black'
              onClick={() => openNewTab()}
              ariaLabel='Add new tab'
            >
              <IoAdd size={18} />
            </Button>
          </div>
          <div className='flex flex-row items-center justify-end gap-2 py-1'>
            <ReactSelect
              aria-label='Select the type of the file'
              isDisabled={!currentEditor}
              value={
                irminFileTypes.find(
                  (a) => a.extension === currentEditor?.language
                ) ?? irminFileTypes[0]
              }
              onChange={(newValue) => {
                if (!newValue) return;
                changeLanguage(newValue.extension);
              }}
              options={irminFileTypes}
              getOptionLabel={(option) => option.name}
              getOptionValue={(option) => option.extension}
              className='react-select-container'
              classNamePrefix='react-select'
            />
            <Button
              disabled={!enableSaveButton}
              size='sm'
              variant='solid'
              colorScheme='secondary'
              className='px-2 py-2 text-xs'
              ariaLabel='Save file'
              onClick={() => saveActiveTabAsFile()}
            >
              <IoSave className='mr-2 inline-block' /> {dict.query.save}
            </Button>
          </div>
        </div>
      )}
      {loadingEditorContent ? (
        <div
          className='w-full bg-white dark:bg-irmin_black'
          style={{ height: editorHeight }}
        />
      ) : (
        <>
          {openFileTabs.length > 0 && currentEditor ? (
            <CodeEditor
              content={currentTabContent}
              updateTabContent={(value) => setCurrentTabContent(value)}
              language={currentEditor.language}
              editorHeight={editorHeight}
              setEditorHeight={setEditorHeight}
            />
          ) : (
            <NewTabContent addNewTab={() => openNewTab()} />
          )}
        </>
      )}
    </>
  );
};

export default EditorWithTabs;
