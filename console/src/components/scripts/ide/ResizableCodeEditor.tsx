'use client';

import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

import CodeMirrorEditor from './CodeMirrorEditor';

/**
 * Resizable Code editor component for the Editor and Query tools
 *
 * Uses {@link CodeMirrorEditor} for the editor
 *
 * @param props - The props for the component
 * @param props.content - The content of the editor
 * @param props.updateTabContent - The function to update the content of the editor
 * @param props.language - The language of the editor
 * @param props.editorHeight - The height of the editor
 * @param props.setEditorHeight - The function to set the height of the editor
 */
const ResizableCodeEditor = ({
  content,
  updateTabContent,
  language,
  editorHeight,
  setEditorHeight,
}: {
  content: string;
  updateTabContent: (_value: string) => void;
  language: string;
  editorHeight: string;
  setEditorHeight: (_height: string) => void;
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const handleMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {});
  const handleMouseUpRef = useRef<() => void>(() => {});

  useEffect(() => {
    handleMouseMoveRef.current = (e: MouseEvent) => {
      const offsetTop = editorRef.current?.offsetTop ?? 0;
      setEditorHeight(`${e.clientY - offsetTop}px`);
    };

    handleMouseUpRef.current = () => {
      document.removeEventListener('mousemove', handleMouseMoveRef.current);
      document.removeEventListener('mouseup', handleMouseUpRef.current);
    };
  }, [setEditorHeight]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    document.addEventListener('mousemove', handleMouseMoveRef.current);
    document.addEventListener('mouseup', handleMouseUpRef.current);
    e.preventDefault();
  }, []);

  return (
    <div
      style={{ maxHeight: editorHeight }}
      ref={editorRef}
      id='code-editor'
      className={`
        flex h-full flex-col bg-gray-200 text-xs
        lg:text-sm
        dark:bg-irmin-black-500
      `}
    >
      <CodeMirrorEditor
        language={language}
        content={content}
        editorHeight={editorHeight}
        updateEditorContent={updateTabContent}
      />
      <button
        type='button'
        aria-label='Resize editor'
        className={`
          h-1 cursor-ns-resize appearance-none border-0 bg-gray-200 p-0
          outline-none
          dark:bg-irmin-blue-500
        `}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

export default ResizableCodeEditor;
