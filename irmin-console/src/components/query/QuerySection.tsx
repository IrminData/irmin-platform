'use client';

import { useState } from 'react';

import CodeEditor from '@/components/bucket/editor/partials/CodeEditor';
import QueryResults from '@/components/query/QueryResults';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * Query Section, provides UI for the Query Page.
 * Used to run Irmin SQL queries on workspace data
 */
export default function QuerySection() {
  const { dict } = useLocale();
  const [editorHeight, setEditorHeight] = useState('200px');
  const [query, setQuery] = useState('');
  const { fetchActionSingleResults, dataResults } = useData();

  return (
    <>
      <CodeEditor
        content={query}
        updateTabContent={setQuery}
        language='sql'
        editorHeight={editorHeight}
        setEditorHeight={setEditorHeight}
      />
      <QueryResults
        title={dict.query.queryResults}
        data={dataResults?.result ?? []}
        metadata={{
          rowsReturned: dataResults?.metadata?.rowsReturned,
          timeTaken: dataResults?.metadata?.timeTaken,
        }}
        onSave={async () => {
          // TODO: Implement save functionality
        }}
        onRun={async () => {
          if (!query || query.length < 3) return;
          await fetchActionSingleResults({
            type: 'sql',
            content: query,
            branch: 'main',
          });
        }}
      />
    </>
  );
}
