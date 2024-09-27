'use client';

import EditorWithTabs from '@/components/bucket/editor/partials/EditorWithTabs';
import QueryResults from '@/components/query/QueryResults';

import { useBucket } from '@/context/BucketContext';
import { useData } from '@/context/DataContext';
import { useEditor } from '@/context/EditorContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * Editor Section, provides UI for the Editor Page.
 * Used to edit files in the Workspace's Bucket
 */
export default function EditorSection() {
  const { dict } = useLocale();
  const { openFileTabs } = useBucket();
  const { currentEditor } = useEditor();
  const { runScript, scriptResult } = useData();

  return (
    <>
      <EditorWithTabs />
      {openFileTabs.length > 0 && (
        <QueryResults
          title={dict.query.results}
          result={scriptResult}
          onSave={async () => {
            // TODO: Implement save functionality
          }}
          onRun={async () => {
            if (!currentEditor || !currentEditor.contents) return;
            await runScript(
              currentEditor.language ?? 'sql',
              currentEditor.contents ?? ''
            );
          }}
        />
      )}
    </>
  );
}
