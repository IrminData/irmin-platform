import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import CodeMirror from '@uiw/react-codemirror';

interface CodeMirrorEditorProps {
  language: string;
  content: string;
  editorHeight: string;
  dict: {
    editor: {
      writeYourPython: string;
      writeYourJS: string;
      writeYourSQL: string;
    };
  };
  updateTabContent: (value: string) => void;
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
  dict,
  updateTabContent,
  ...props
}) => {
  const getExtensions = () => {
    switch (language) {
      case 'py':
        return [python()];
      case 'js':
        return [javascript()];
      case 'sql':
      default:
        return [sql()];
    }
  };

  const getPlaceholder = () => {
    switch (language) {
      case 'py':
        return dict.editor.writeYourPython;
      case 'js':
        return dict.editor.writeYourJS;
      case 'sql':
        return dict.editor.writeYourSQL;
      default:
        return '';
    }
  };

  return (
    <CodeMirror
      value={content}
      height={editorHeight}
      extensions={getExtensions()}
      placeholder={getPlaceholder()}
      onChange={(value) => updateTabContent(value)}
      {...props}
    />
  );
};

export default CodeMirrorEditor;
