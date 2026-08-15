'use client';

import { TbDeviceFloppy, TbPlus, TbX } from 'react-icons/tb';

import ScriptHelper from '@/components/scripts/helper/ScriptHelper';
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
            mb-0 flex items-center justify-between gap-1 border-b border-border
            pr-2 pb-0
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
                  aria-pressed={activeTab === index}
                  className={`
                    scrollbar-hide max-w-32 min-w-20 overflow-x-scroll px-2 py-1
                    text-sm whitespace-nowrap
                    hover:no-underline
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-accent
                  `}
                  onClick={() => setActiveTab(index)}
                >
                  {tab.name || dict.assistant.untitledConversation}
                </button>
                <button
                  type='button'
                  aria-label={`${dict.common.close}: ${tab.name || dict.assistant.untitledConversation}`}
                  className={`
                    cursor-pointer border-none p-1
                    hover:opacity-70
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-accent
                  `}
                  onClick={() => closeTab(tab.id)}
                >
                  <TbX aria-hidden='true' size={12} />
                </button>
              </div>
            ))}
            <button
              type='button'
              aria-label={dict.scripts.newScriptTitle}
              className={`
                cursor-pointer rounded-[2px] border-none p-2 transition-colors
                hover:bg-muted
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-accent
              `}
              onClick={() => openNewTab()}
            >
              <TbPlus aria-hidden='true' size={16} />
            </button>
          </div>
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-2'>
              <select
                id='language-select'
                aria-label={dict.common.selectLanguage}
                value={currentTab?.language || 'go'}
                onChange={(e) => changeLanguage(e.target.value)}
                disabled={currentTab?.isSaved}
                className={`
                  w-24 rounded-[2px] border border-input bg-background px-2 py-1
                  text-base
                  disabled:opacity-50
                  md:text-sm
                `}
              >
                <option value='go'>Go</option>
              </select>
            </div>
            <ScriptHelper
              scriptName={currentTab?.name}
              language={currentTab?.language}
              currentContent={currentTab?.content}
            />
            <Button
              onClick={saveCurrentTab}
              variant='accent'
              size='sm'
              icon={<TbDeviceFloppy />}
              disabled={!enableSaveButton}
            >
              {dict.common.save}
            </Button>
          </div>
        </div>
      )}

      {openTabs.length === 0 ? (
        <NewTabContent addNewTab={() => openNewTab()} />
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
