'use client';

import { forwardRef } from 'react';

import dynamic from 'next/dynamic';

import { MDXEditorMethods } from '@mdxeditor/editor';

import type { InitialisedMDXEditorProps } from '@/components/ui/markdown-editor/initialisedMDXEditor';

const Editor = dynamic(
  () => import('@/components/ui/markdown-editor/initialisedMDXEditor'),
  {
    ssr: false,
  }
);

/**
 * MDX editor component
 *
 * @remarks
 *
 * This is what is imported by other components. Pre-initialised with plugins, and ready
 * to accept other props, including a ref.
 */
const MDXEditor = forwardRef<MDXEditorMethods, InitialisedMDXEditorProps>(
  (props, ref) => (
    <Editor {...props} editorRef={ref}>
      {props.children}
    </Editor>
  )
);

// TS complains without the following line
MDXEditor.displayName = 'MDXEditor';

export default MDXEditor;
