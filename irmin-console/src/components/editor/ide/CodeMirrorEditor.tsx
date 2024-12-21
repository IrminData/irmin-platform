'use client';

import { memo, useMemo } from 'react';

import dynamic from 'next/dynamic';

import { go } from '@codemirror/lang-go';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import {
  vscodeDark,
  vscodeDarkInit,
  vscodeLight,
  vscodeLightInit,
} from '@uiw/codemirror-theme-vscode';
import { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { useTheme } from 'next-themes';

import { useLocale } from '@/context/LocaleContext';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
});

const CodeMirrorEditor = ({
  language,
  content,
  editorHeight,
  updateEditorContent,
  ...editorProps
}: {
  language: string;
  content: string;
  editorHeight?: string;
  updateEditorContent: (value: string) => void;
} & ReactCodeMirrorProps) => {
  const { dict } = useLocale();
  const { resolvedTheme } = useTheme();

  const editorTheme = useMemo(
    () => (resolvedTheme === 'dark' ? vscodeDark : vscodeLight),
    [resolvedTheme]
  );

  const initialisedEditorTheme = useMemo(
    () => (resolvedTheme === 'dark' ? vscodeDarkInit() : vscodeLightInit()),
    [resolvedTheme]
  );

  const placeholder = useMemo(() => {
    if (language === 'js') return dict.editor.writeYourJS;
    if (language === 'go') return dict.editor.writeYourGo;
    if (language === 'md') return dict.editor.writeYourMarkdown;
    return dict.editor.writeYourSQL;
  }, [language, dict]);

  const extensions = useMemo(() => {
    if (!editorTheme) return [];
    if (language === 'js')
      return [editorTheme, javascript({ jsx: false, typescript: false })];
    if (language === 'go') return [editorTheme, go()];
    if (language === 'md') return [editorTheme, markdown()];
    return [editorTheme, sql({ dialect: PostgreSQL })];
  }, [language, editorTheme]);

  return (
    <div
      style={{
        maxHeight: editorHeight ?? '100%',
      }}
      className='codemirror-editor relative h-full w-full overflow-scroll bg-white dark:bg-gray-950'
    >
      <CodeMirror
        value={content}
        height='100%'
        extensions={extensions}
        placeholder={placeholder}
        onChange={(value) => updateEditorContent(value)}
        theme={initialisedEditorTheme}
        {...editorProps}
      />
    </div>
  );
};

export default memo(CodeMirrorEditor);
