'use client';

import type { CSSProperties } from 'react';
import { memo, useMemo } from 'react';

import dynamic from 'next/dynamic';

import { go } from '@codemirror/lang-go';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror';
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
  containerStyles,
  ...editorProps
}: ReactCodeMirrorProps & {
  language: string;
  content: string;
  editorHeight?: string;
  containerStyles?: CSSProperties;
  updateEditorContent: (value: string) => void;
}) => {
  const { dict } = useLocale();
  const { resolvedTheme } = useTheme();

  // Pass the theme ONLY via the `theme` prop — not also as an extension.
  // Prior to #822's @uiw/react-codemirror 4.25.3 → 4.25.9 bump both paths
  // happened to coexist; after the bump they install conflicting
  // HighlightStyle instances and the editor ends up with no active
  // syntax highlighting (everything renders as plain foreground text).
  // Canonical usage per the package's own README is theme prop + language
  // extensions only.
  const editorTheme = resolvedTheme === 'dark' ? vscodeDark : vscodeLight;

  const placeholder = useMemo(() => {
    if (language === 'js') return dict.scripts.writeYourJS;
    if (language === 'go') return dict.scripts.writeYourGo;
    if (language === 'py') return dict.scripts.writeYourPython;
    if (language === 'sql') return dict.scripts.writeYourSQL;
    if (language === 'md') return dict.scripts.writeYourMarkdown;
    if (language === 'json') return dict.scripts.writeYourJSON;
    return dict.scripts.writeYourText;
  }, [language, dict]);

  const extensions = useMemo(() => {
    if (language === 'js')
      return [javascript({ jsx: false, typescript: false })];
    if (language === 'go') return [go()];
    if (language === 'py') return [python()];
    if (language === 'md') return [markdown()];
    if (language === 'sql') return [sql({ dialect: PostgreSQL })];
    if (language === 'json') return [json()];
    return [];
  }, [language]);

  return (
    <div
      style={{
        maxHeight: editorHeight ?? '100%',
        ...containerStyles,
      }}
      className={`
        codemirror-editor relative size-full overflow-scroll bg-white
        dark:bg-gray-950
      `}
    >
      <CodeMirror
        value={content}
        height='100%'
        extensions={extensions}
        placeholder={placeholder}
        onChange={(value) => updateEditorContent(value)}
        theme={editorTheme}
        {...editorProps}
      />
    </div>
  );
};

export default memo(CodeMirrorEditor);
