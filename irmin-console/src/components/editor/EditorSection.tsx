'use client';

import { useEditor } from '@/context/EditorContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Repository } from '@/types/core/Repository';

import EditorWithTabs from './ide/EditorWithTabs';
import ScriptResults from './ScriptResults';

/**
 * Editor Section, provides UI for the Editor Page.
 * Used to edit files in the Workspace's EditorItems
 *
 * @param props - The props to pass to the component
 * @param props.repositories - The repositories to pass to the component
 */
export default function EditorSection({
  repositories,
}: {
  repositories: Repository[];
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const {
    enableSaveButton,
    currentEditor,
    openFileTabs,
    scriptExecutionInProgress,
    scriptExecutionResult,
    executeScript,
    scriptInputFiles,
    setScriptInputFiles,
  } = useEditor();

  return (
    <>
      <EditorWithTabs />
      {openFileTabs.length > 0 && (
        <ScriptResults
          result={scriptExecutionResult}
          loading={scriptExecutionInProgress}
          repositories={repositories}
          inputFiles={scriptInputFiles}
          setInputFiles={setScriptInputFiles}
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
