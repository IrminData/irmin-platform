'use client';

import { memo, useMemo } from 'react';

import { javascript } from '@codemirror/lang-javascript';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror, { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { useTheme } from 'next-themes';

import { useLocale } from '@/context/LocaleContext';

interface CodeMirrorEditorProps extends ReactCodeMirrorProps {
  language: string;
  content: string;
  editorHeight: string;
  updateEditorContent: (value: string) => void;
}

/**
 * CodeMirror editor component with support for JavaScript and SQL
 *
 * @param props - The props for the component  {@link ReactCodeMirrorProps}
 * @param props.language - The language of the editor (eg. 'js' or 'sql')
 * @param props.content - The content of the editor
 * @param props.editorHeight - The height of the editor
 * @param props.updateEditorContent - Callback to update the content of the editor
 */
const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  language,
  content,
  editorHeight,
  updateEditorContent,
  ...editorProps
}) => {
  const { dict } = useLocale();
  const { resolvedTheme } = useTheme();

  const placeholder = useMemo(
    () =>
      language === 'js' ? dict.editor.writeYourJS : dict.editor.writeYourSQL,
    [language, dict]
  );

  const extensions = useMemo(() => {
    if (language === 'js') {
      return [javascript({ jsx: false, typescript: false })];
    }
    return [
      sql({
        dialect: PostgreSQL,
      }),
    ];
  }, [language]);

  if (!resolvedTheme) return <></>;

  const editorTheme = resolvedTheme === 'dark' ? githubDark : githubLight;

  return (
    <CodeMirror
      value={content}
      height={editorHeight}
      extensions={extensions}
      placeholder={placeholder}
      theme={editorTheme}
      onChange={(value) => updateEditorContent(value)}
      {...editorProps}
    />
  );
};

export default memo(CodeMirrorEditor);
