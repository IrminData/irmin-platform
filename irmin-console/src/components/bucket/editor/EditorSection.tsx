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
  const { fetchActionSingleResults, dataResults } = useData();

  return (
    <>
      <EditorWithTabs />
      {openFileTabs.length > 0 && (
        <QueryResults
          title={dict.query.results}
          data={dataResults?.result ?? null}
          metadata={{
            rowsReturned: dataResults?.metadata?.rowsReturned,
            timeTaken: dataResults?.metadata?.timeTaken,
          }}
          onSave={async () => {
            // TODO: Implement save functionality
          }}
          onRun={async () => {
            if (!currentEditor || !currentEditor.contents) return;
            await fetchActionSingleResults({
              type: currentEditor.language ?? 'sql',
              content: currentEditor.contents ?? '',
              branch: 'main',
            });
          }}
        />
      )}
    </>
  );
}
