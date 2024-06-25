'use client';

import { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor';
import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
const Editor = dynamic(
  () => import('@/components/mdx-editor/initializedMDXEditor'),
  {
    ssr: false,
  }
);

// This is what is imported by other components. Pre-initialized with plugins, and ready
// to accept other props, including a ref.
const MDXEditor = forwardRef<MDXEditorMethods, MDXEditorProps>((props, ref) => (
  <Editor {...props} editorRef={ref} />
));

// TS complains without the following line
MDXEditor.displayName = 'MDXEditor';

export default MDXEditor;
