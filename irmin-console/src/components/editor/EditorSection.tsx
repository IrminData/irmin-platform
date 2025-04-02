'use client';

import { useEditor } from '@/context/EditorContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import EditorWithTabs from './ide/EditorWithTabs';
import ScriptResults from './ScriptResults';

/**
 * Editor Section, provides UI for the Editor Page.
 * Used to edit files in the Workspace's EditorItems
 */
export default function EditorSection() {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const {
    enableSaveButton,
    currentEditor,
    openFileTabs,
    scriptExecutionInProgress,
    scriptExecutionResult,
    executeScript,
  } = useEditor();

  return (
    <>
      <EditorWithTabs />
      {openFileTabs.length > 0 && (
        <ScriptResults
          title={dict.query.results}
          result={scriptExecutionResult}
          loading={scriptExecutionInProgress}
          onRun={async () => {
            if (!currentEditor || !currentEditor.path) return;
            if (scriptExecutionInProgress) return;
            // Make sure the script is saved before executing
            if (enableSaveButton || !currentEditor.created) {
              irminAlert('info', dict.editor.scriptNeedsToBeSaved);
              return;
            }
            executeScript(currentEditor.path);
          }}
        />
      )}
    </>
  );
}
