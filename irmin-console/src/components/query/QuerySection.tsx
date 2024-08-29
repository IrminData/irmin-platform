'use client';

import { useState } from 'react';

import CodeEditor from '@/components/bucket/editor/partials/CodeEditor';
import QueryResults from '@/components/query/QueryResults';

import { useLocale } from '@/context/LocaleContext';

import { placeholderData } from '@/types/examples/datatableData';

/**
 * Query Section, provides UI for the Query Page.
 * Used to run Irmin SQL queries on workspace data
 */
export default function QuerySection() {
  const { dict } = useLocale();
  const [editorHeight, setEditorHeight] = useState('200px');
  const [query, setQuery] = useState('');
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
        data={placeholderData}
        metadata={{ rowsReturned: placeholderData.length, timeTaken: 0.1 }}
        onSave={() => {
          // TODO: Implement save functionality
        }}
        onRun={() => {
          // TODO: Implement run functionality
        }}
      />
    </>
  );
}
