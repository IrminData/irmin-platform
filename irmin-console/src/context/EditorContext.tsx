'use client';

import { createContext, useContext } from 'react';

import { useEditor as useEditorHook } from '@/hooks/useEditor';

import { EditorItems } from '@/types/core/EditorItems';
import { IrminFileType } from '@/types/core/EditorItems';
import { FileContents } from '@/types/internal/FileContents';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

interface EditorContextType {
  items: FileNavigatorItem[];
  // Editor Tabs and Contents
  openFileTabs: string[];
  activeTab: number;
  editorHeight: string;
  currentEditor: FileContents | undefined;
  enableSaveButton: boolean;
  // State Setters
  setActiveTab: (index: number) => void;
  setEditorHeight: (height: string) => void;
  // Editor Actions
  openNewTab: () => void;
  openFile: (file: FileNavigatorItem) => void;
  closeTab: (tab: string) => void;
  updateCurrentTabContent: (content: string) => void;
  saveActiveTabAsFile: () => void;
  changeLanguage: (language: IrminFileType) => void;
  // Item Actions
  addNewFile: () => void;
  addNewFolder: () => void;
  renameOrMoveItem: (item: FileNavigatorItem) => void;
  deleteItem: (item: FileNavigatorItem) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({
  children,
  editorItems,
}: {
  children: React.ReactNode;
  editorItems: EditorItems;
}) => {
  const editor = useEditorHook(editorItems);

  return (
    <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
