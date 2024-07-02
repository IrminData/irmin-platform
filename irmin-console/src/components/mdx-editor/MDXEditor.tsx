'use client';

import { forwardRef } from 'react';

import dynamic from 'next/dynamic';

import { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor';

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
