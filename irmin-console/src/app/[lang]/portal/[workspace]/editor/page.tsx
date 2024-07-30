'use client';

import { useState } from 'react';

import EditorResults from '@/components/editor/editorResults';
import EditorWithTabs from '@/components/editor/editorWithTabs';

/**
 * Portal editor page
 *
 * @remarks
 *
 * This page is used to manage files in the Workspace's Bucket.
 * These files are used to create Actions.
 *
 * This is just a page that contains the {@link EditorWithTabs} and {@link EditorResults} components.
 *
 * @returns  Editor UI
 */
export default function EditorPage() {
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
