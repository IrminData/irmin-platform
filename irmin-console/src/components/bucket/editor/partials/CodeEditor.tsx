'use client';

import React, { useCallback, useRef } from 'react';

import { IrminFileType } from '@/types/core/Bucket';

import CodeMirrorEditor from './CodeMirrorEditor';

/**
 * Code editor component for the Editor and Query tools
 *
 * Used to edit files in the Workspace's Bucket and run Irmin SQL queries on workspace data.
 *
 * @param props - The props for the component
 * @param props.content - The content of the editor
 * @param props.updateTabContent - The function to update the content of the editor
 * @param props.language - The language of the editor
 * @param props.editorHeight - The height of the editor
 * @param props.setEditorHeight - The function to set the height of the editor
 *
 * @returns The CodeEditor component
 */
const CodeEditor = ({
  content,
  updateTabContent,
  language,
  editorHeight,
  setEditorHeight,
}: {
  content: string;
  updateTabContent: (_value: string) => void;
  language: IrminFileType;
  editorHeight: string;
  setEditorHeight: (_height: string) => void;
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
    <div
      style={{ minHeight: editorHeight }}
      ref={editorRef}
      id='code-editor'
      className='bg-gray-200 text-xs lg:text-sm dark:bg-irmin_black'
    >
      <CodeMirrorEditor
        language={language}
        content={content}
        editorHeight={editorHeight}
        updateEditorContent={updateTabContent}
      />
      <div
        className='resizer h-1 cursor-ns-resize bg-gray-200 dark:bg-irmin_blue'
        onMouseDown={handleMouseDown}
      ></div>
    </div>
  );
};

export default CodeEditor;
