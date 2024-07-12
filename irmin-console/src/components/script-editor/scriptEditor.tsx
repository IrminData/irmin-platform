import React, { useCallback, useRef } from 'react';

import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import CodeMirror from '@uiw/react-codemirror';

import { useLocale } from '@/context/LocaleContext';

const ScriptEditor = ({
  content,
  language,
  editorHeight,
  setEditorHeight,
}: {
  content: string;
  language: 'sql' | 'js' | 'python';
  editorHeight: string;
  setEditorHeight: (_height: string) => void;
}) => {
  const { dict } = useLocale();
  const editorRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const offsetTop = editorRef.current?.offsetTop ?? 0;
      setEditorHeight(`${e.clientY - offsetTop}px`);
    },
    [setEditorHeight]
  );

  const handleMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  return (
    <div style={{ minHeight: editorHeight }} ref={editorRef}>
      {language === 'sql' ? (
        <CodeMirror
          defaultValue={content}
          height={editorHeight}
          extensions={[sql()]}
          placeholder={dict.editor.writeYourSQL}
          onChange={(value) => setEditorHeight(value)}
        />
      ) : language === 'js' ? (
        <CodeMirror
          defaultValue={content}
          height={editorHeight}
          extensions={[javascript()]}
          placeholder={dict.editor.writeYourJS}
          onChange={(value) => setEditorHeight(value)}
        />
      ) : (
        <CodeMirror
          defaultValue={content}
          height={editorHeight}
          extensions={[python()]}
          placeholder={dict.editor.writeYourPython}
          onChange={(value) => setEditorHeight(value)}
        />
      )}
      <div
        className='resizer h-1 cursor-ns-resize bg-gray-200'
        onMouseDown={handleMouseDown}
      ></div>
    </div>
  );
};

export default ScriptEditor;
