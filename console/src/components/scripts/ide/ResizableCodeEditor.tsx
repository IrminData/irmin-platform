'use client';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- A focusable separator is an interactive splitter under the ARIA pattern. */
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { useLocale } from '@/context/LocaleContext';

import CodeMirrorEditor from './CodeMirrorEditor';

const MIN_EDITOR_HEIGHT = 160;
const MAX_EDITOR_HEIGHT = 1200;
const EDITOR_RESIZE_STEP = 24;

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
  const { dict } = useLocale();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const handleMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {});
  const handleMouseUpRef = useRef<() => void>(() => {});

  useEffect(() => {
    handleMouseMoveRef.current = (e: MouseEvent) => {
      const offsetTop = editorRef.current?.offsetTop ?? 0;
      const nextHeight = Math.min(
        MAX_EDITOR_HEIGHT,
        Math.max(MIN_EDITOR_HEIGHT, e.clientY - offsetTop)
      );
      setEditorHeight(`${nextHeight}px`);
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

  const numericEditorHeight = Number.parseFloat(editorHeight);
  const currentEditorHeight = Number.isFinite(numericEditorHeight)
    ? numericEditorHeight
    : MIN_EDITOR_HEIGHT;

  const handleSeparatorKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const decrease = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
      const increase = event.key === 'ArrowRight' || event.key === 'ArrowDown';

      if (!decrease && !increase) return;

      event.preventDefault();
      const delta = decrease ? -EDITOR_RESIZE_STEP : EDITOR_RESIZE_STEP;
      const nextHeight = Math.min(
        MAX_EDITOR_HEIGHT,
        Math.max(MIN_EDITOR_HEIGHT, currentEditorHeight + delta)
      );
      setEditorHeight(`${nextHeight}px`);
    },
    [currentEditorHeight, setEditorHeight]
  );

  return (
    <div
      style={{ maxHeight: editorHeight }}
      ref={editorRef}
      id='code-editor'
      className={`
        flex h-full flex-col bg-muted text-xs
        lg:text-sm
      `}
    >
      <CodeMirrorEditor
        language={language}
        content={content}
        editorHeight={editorHeight}
        updateEditorContent={updateTabContent}
      />
      <div
        role='separator'
        aria-label={dict.common.resizeEditor}
        aria-orientation='horizontal'
        aria-valuemin={MIN_EDITOR_HEIGHT}
        aria-valuemax={MAX_EDITOR_HEIGHT}
        aria-valuenow={Math.round(currentEditorHeight)}
        tabIndex={0}
        className={`
          relative h-1 w-full cursor-ns-resize border-0 bg-border p-0
          transition-colors
          before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']
          hover:bg-accent
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-accent
        `}
        onMouseDown={handleMouseDown}
        onKeyDown={handleSeparatorKeyDown}
      />
    </div>
  );
};

export default ResizableCodeEditor;
