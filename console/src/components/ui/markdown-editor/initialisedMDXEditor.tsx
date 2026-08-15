'use client';

import type { ForwardedRef } from 'react';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  type CodeBlockEditorDescriptor,
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
  useCodeBlockEditorContext,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

import { useLocale } from '@/context/LocaleContext';

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
function PlainTextCodeEditor({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const cb = useCodeBlockEditorContext();
  const { dict } = useLocale();
  return (
    <pre className='rounded-[2px] bg-muted p-4 font-mono text-sm'>
      <textarea
        aria-label={dict.common.codeEditor}
        className={`
          w-full resize-none bg-transparent text-base
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-accent
          md:text-sm
        `}
        rows={Math.max(code.split('\n').length, 3)}
        defaultValue={code}
        onChange={(e) => cb.setCode(e.target.value)}
        spellCheck={false}
        data-language={language}
      />
    </pre>
  );
}

const PlainTextCodeEditorDescriptor: CodeBlockEditorDescriptor = {
  match: () => true,
  priority: 0,
  Editor: PlainTextCodeEditor,
};

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
          codeBlockPlugin({
            defaultCodeBlockLanguage: '',
            codeBlockEditorDescriptors: [PlainTextCodeEditorDescriptor],
          }),
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
