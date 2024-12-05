'use client';

import { memo, useMemo } from 'react';

import { javascript } from '@codemirror/lang-javascript';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import {
  vscodeDark,
  vscodeDarkInit,
  vscodeLight,
} from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';
import { useTheme } from 'next-themes';

import { useLocale } from '@/context/LocaleContext';

interface CodeMirrorEditorProps {
  language: string;
  content: string;
  editorHeight?: string;
  updateEditorContent: (value: string) => void;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  language,
  content,
  editorHeight,
  updateEditorContent,
  ...editorProps
}) => {
  const { dict } = useLocale();
  const { resolvedTheme } = useTheme();

  const editorTheme = useMemo(
    () => (resolvedTheme === 'dark' ? vscodeDark : vscodeLight),
    [resolvedTheme]
  );

  const placeholder = useMemo(
    () =>
      language === 'js' ? dict.editor.writeYourJS : dict.editor.writeYourSQL,
    [language, dict]
  );

  const extensions = useMemo(() => {
    if (language === 'js') {
      return [editorTheme, javascript({ jsx: false, typescript: false })];
    }
    return [editorTheme, sql({ dialect: PostgreSQL })];
  }, [language, editorTheme]);

  if (!resolvedTheme) return null;

  return (
    <div
      style={{
        maxHeight: editorHeight,
      }}
      className='relative h-full w-full overflow-scroll'
    >
      <CodeMirror
        value={content}
        height={'100%'}
        extensions={extensions}
        placeholder={placeholder}
        onChange={(value) => updateEditorContent(value)}
        theme={vscodeDarkInit()}
        {...editorProps}
      />
    </div>
  );
};

export default memo(CodeMirrorEditor);
