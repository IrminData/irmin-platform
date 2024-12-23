'use client';

import { IoAdd, IoClose, IoSave } from 'react-icons/io5';
import { TbRun } from 'react-icons/tb';

import Button from '@/components/ui/button';

import { useEditor } from '@/context/EditorContext';
import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { getNameFromPath } from '@/utils/editorItems';

import { irminFileTypes } from '@/types/core/EditorItems';

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
    openFileTabs,
    activeTab,
    updateCurrentTabContent,
    setEditorHeight,
    setActiveTab,
    saveActiveTabAsFile,
    closeTab,
    changeLanguage,
    openNewTab,
    editorHeight,
    enableSaveButton,
    currentEditor,
  } = useEditor();

  const { dict } = useLocale();

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  return (
    <>
      {openFileTabs.length > 0 && (
        <div className='mb-0 flex items-center justify-between gap-1 border-b border-gray-200 pb-0 pr-2 dark:border-irmin_black'>
          <div className='scrollbar-hide flex h-full items-center overflow-x-auto'>
            {openFileTabs.map((tab, index) => (
              <div
                key={index}
                className={`flex h-full w-40 items-center justify-between ${
                  activeTab === index ? 'border-b-2 border-accent' : ''
                } `}
              >
                <button
                  type='button'
                  className={`scrollbar-hide min-w-20 max-w-32 overflow-x-scroll whitespace-nowrap px-2 py-1 text-sm hover:no-underline`}
                  onClick={() => setActiveTab(index)}
                >
                  {tab ? getNameFromPath(tab) : 'Untitled'}
                </button>
                <button
                  type='button'
                  className={`border-none px-1 py-1`}
                  onClick={() => closeTab(tab)}
                >
                  <IoClose size={12} />
                </button>
              </div>
            ))}
            <button
              type='button'
              className={`border-none px-1 py-1 hover:opacity-70`}
              onClick={() => openNewTab()}
              aria-label='Add new tab'
            >
              <IoAdd size={18} />
            </button>
          </div>
          <div className='flex flex-row items-center justify-end gap-2 py-1'>
            <select
              aria-label='Select the type of the file'
              disabled={!currentEditor}
              value={currentEditor?.language ?? irminFileTypes[0].extension}
              onChange={(event) => {
                const newValue = event.target.value;
                changeLanguage(newValue);
              }}
              className='py-1 pl-2 pr-8 text-xs'
            >
              {irminFileTypes.map((fileType) => (
                <option key={fileType.extension} value={fileType.extension}>
                  {fileType.name}
                </option>
              ))}
            </select>
            <Button
              size='sm'
              variant='secondary'
              className='px-2 py-2 text-xs'
              aria-label='Save file as workflow'
              disabled={!currentEditor}
              href={`${workspaceUrl}/workflows/actions/create?executable=${currentEditor?.path}`}
            >
              <TbRun className='mr-1 inline-block' />{' '}
              {dict.query.saveAsWorkflow}
            </Button>
            <Button
              disabled={!enableSaveButton}
              size='sm'
              variant='default'
              className='px-2 py-2 text-xs'
              aria-label='Save file'
              onClick={() => saveActiveTabAsFile()}
            >
              <IoSave className='mr-1 inline-block' /> {dict.common.save}
            </Button>
          </div>
        </div>
      )}
      {openFileTabs.length > 0 && currentEditor && (
        <div className='scrollbar-hide w-full overflow-x-scroll border-b border-gray-200 px-2 py-1 dark:border-irmin_black'>
          <p className='text-xs opacity-60'>{currentEditor.path}</p>
        </div>
      )}
      {openFileTabs.length > 0 && currentEditor ? (
        <ResizableCodeEditor
          content={currentEditor.contents}
          updateTabContent={(value) => updateCurrentTabContent(value)}
          language={currentEditor.language}
          editorHeight={editorHeight}
          setEditorHeight={setEditorHeight}
        />
      ) : (
        <NewTabContent addNewTab={() => openNewTab()} />
      )}
    </>
  );
};

export default EditorWithTabs;
