'use client';

import type { ForwardedRef } from 'react';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  codeBlockPlugin,
  CodeToggle,
  CreateLink,
  headingsPlugin,
  InsertTable,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

export type InitialisedMDXEditorProps = MDXEditorProps & {
  children: React.ReactNode;
};

/**
 * Initialized MDX editor
 *
 * @remarks
 *
 * Don't import this directly, use the `src/components/ui/markdown-editor/MDXEditor.tsx` instead.
 *
 * {@link https://www.npmjs.com/package/@mdxeditor/editor}
 *
 */
export default function InitialisedMDXEditor({
  editorRef,
  children,
  ...props
}: MDXEditorProps & {
  children: React.ReactNode;
  editorRef: ForwardedRef<MDXEditorMethods> | null;
}) {
  return (
    <div>
      <MDXEditor
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
          toolbarPlugin({
            toolbarContents: () => (
              <div className='flex w-full flex-row justify-end gap-2 px-2'>
                <BlockTypeSelect />
                <UndoRedo />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <CreateLink />
                <InsertTable />
                {children}
              </div>
            ),
          }),
        ]}
        {...props}
        contentEditableClassName='mdx-editor-prose'
        ref={editorRef}
      />
    </div>
  );
}
