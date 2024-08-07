'use client';

import { useState } from 'react';

import EditorResults from '@/components/bucket/editor/partials/EditorResults';
import EditorWithTabs from '@/components/bucket/editor/partials/EditorWithTabs';

/**
 * Editor Section, provides UI for the Editor Page.
 * Used to edit files in the Workspace's Bucket
 */
export default function EditorSection() {
  const [editorHeight, setEditorHeight] = useState('400px');

  return (
    <>
      <EditorWithTabs
        editorHeight={editorHeight}
        setEditorHeight={setEditorHeight}
      />
      <EditorResults editorHeight={editorHeight} />
    </>
  );
}
