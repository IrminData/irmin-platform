import React, { useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { python } from '@codemirror/lang-python';

const ScriptEditor = ({
  content,
  language,
  editorHeight,
  setEditorHeight,
}: {
  content: string;
  language: 'sql' | 'python';
  editorHeight: string;
  setEditorHeight: (height: string) => void;
}) => {
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
          value={content}
          height={editorHeight}
          extensions={[sql()]}
          placeholder='Write your SQL query here...'
          onChange={(value) => setEditorHeight(value)}
        />
      ) : (
        <CodeMirror
          value={content}
          height={editorHeight}
          extensions={[python()]}
          placeholder='Write your Python script here...'
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
