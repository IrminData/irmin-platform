'use client';

import dynamic from 'next/dynamic';

import { javascript } from '@codemirror/lang-javascript';
import { sql } from '@codemirror/lang-sql';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { useTheme } from 'next-themes';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  loading: () => <LoadingSkeleton />,
});

interface CodeMirrorEditorProps {
  language: string;
  content: string;
  editorHeight: string;
  updateEditorContent: (value: string) => void;
  [key: string]: unknown; // For other props
}

/**
 * CodeMirrorEditor component for the CodeMirror editor
 *
 * Seperated from the CodeEditor component to allow for improved rendering
 */
const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  language,
  content,
  editorHeight,
  updateEditorContent,
  ...props
}) => {
  const { dict } = useLocale();
  const { theme } = useTheme();

  const getExtensions = () => {
    switch (language) {
      case 'js':
        return [
          javascript({
            jsx: false,
            typescript: false,
          }),
        ];
      case 'sql':
      default:
        return [sql()];
    }
  };

  const getPlaceholder = () => {
    switch (language) {
      case 'js':
        return dict.editor.writeYourJS;
      case 'sql':
        return dict.editor.writeYourSQL;
      default:
        return '';
    }
  };

  if (!theme) return <LoadingSkeleton className='h-96' />;

  const editorTheme = theme === 'dark' ? githubDark : githubLight;

  return (
    <CodeMirror
      value={content}
      height={editorHeight}
      extensions={getExtensions()}
      placeholder={getPlaceholder()}
      theme={editorTheme}
      onChange={(value) => updateEditorContent(value)}
      {...props}
    />
  );
};

export default CodeMirrorEditor;
