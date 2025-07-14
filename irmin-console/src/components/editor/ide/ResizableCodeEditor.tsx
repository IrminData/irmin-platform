'use client';

import type React from 'react';
import { useCallback, useRef } from 'react';

import type { IrminFileLanguage } from '@/types/core/EditorItems';

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
  language: IrminFileLanguage;
  editorHeight: string;
  setEditorHeight: (_height: string) => void;
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
    },
    [handleMouseMove, handleMouseUp]
  );

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
