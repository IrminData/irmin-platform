'use client';

import { useState } from 'react';

import EditorWithTabs from '@/components/bucket/editor/partials/EditorWithTabs';
import QueryResults from '@/components/query/QueryResults';

import { useBucket } from '@/context/BucketContext';
import { useLocale } from '@/context/LocaleContext';

import { placeholderData } from '@/types/examples/datatableData';

/**
 * Editor Section, provides UI for the Editor Page.
 * Used to edit files in the Workspace's Bucket
 */
export default function EditorSection() {
  const { dict } = useLocale();
  const { openFileTabs } = useBucket();
  const [editorHeight, setEditorHeight] = useState('400px');

  return (
    <>
      <EditorWithTabs
        editorHeight={editorHeight}
        setEditorHeight={setEditorHeight}
      />
      {openFileTabs.length > 0 && (
        <QueryResults
          title={dict.editor.actionResults}
          data={placeholderData}
          metadata={{ rowsReturned: placeholderData.length, timeTaken: 0.1 }}
          onSave={() => {
            // TODO: Implement save functionality
          }}
          onRun={() => {
            // TODO: Implement run functionality
          }}
        />
      )}
    </>
  );
}
