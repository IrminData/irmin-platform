'use client';

import QueryResults from '@/components/query/QueryResults';

import { useEditor } from '@/context/EditorContext';
import { useEditorItems } from '@/context/EditorItemsContext';
import { useLocale } from '@/context/LocaleContext';
import { useQuery } from '@/context/QueryContext';

import EditorWithTabs from './ide/EditorWithTabs';

/**
 * Editor Section, provides UI for the Editor Page.
 * Used to edit files in the Workspace's EditorItems
 */
export default function EditorSection() {
  const { dict } = useLocale();
  const { openFileTabs } = useEditorItems();
  const { currentEditor } = useEditor();
  const query = useQuery();

  return (
    <>
      <EditorWithTabs />
      {openFileTabs.length > 0 && (
        <QueryResults
          title={dict.query.results}
          result={query.result}
          onSave={async () => {
            // TODO: Implement save functionality
          }}
          onRun={async () => {
            if (!currentEditor || !currentEditor.contents) return;
            await query.executeScript(
              currentEditor.language ?? 'sql',
              currentEditor.contents ?? ''
            );
          }}
        />
      )}
    </>
  );
}
