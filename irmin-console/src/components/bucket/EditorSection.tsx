'use client';

import QueryResults from '@/components/query/QueryResults';

import { useBucket } from '@/context/BucketContext';
import { useEditor } from '@/context/EditorContext';
import { useLocale } from '@/context/LocaleContext';
import { useQuery } from '@/context/QueryContext';

import EditorWithTabs from './editor/EditorWithTabs';

/**
 * Editor Section, provides UI for the Editor Page.
 * Used to edit files in the Workspace's Bucket
 */
export default function EditorSection() {
  const { dict } = useLocale();
  const { openFileTabs } = useBucket();
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
