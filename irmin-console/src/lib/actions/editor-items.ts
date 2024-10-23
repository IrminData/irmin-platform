'use server';

import { initCore } from '@/lib/initCore';

import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Server action to get the list of files and folders in the Workspace's EditorItems.
 *
 * @returns The EditorItems object
 */
export async function getEditorItems() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the editorItems
  const editorItems = await irminCore.editorItemService.fetchEditorItems();
  return editorItems.data;
}

/**
 * Server action to create a file or folder in the Workspace's EditorItems.
 */
export async function createEditorItem(file: FileNavigatorItem) {
  const irminCore = await initCore();
  if (file.type === 'folder') {
    const res = await irminCore.editorItemService.createFolder(file);
    return res;
  }
  const res = await irminCore.editorItemService.createFile(file);
  return res;
}

/**
 * Server action to delete a file or folder in the Workspace's EditorItems.
 */
export async function deleteEditorItem(file: FileNavigatorItem) {
  const irminCore = await initCore();
  if (file.type === 'folder') {
    const res = await irminCore.editorItemService.deleteFolder(file);
    return res;
  }
  const res = await irminCore.editorItemService.deleteFile(file);
  return res;
}

/**
 * Server action to update a file or folder in the Workspace's EditorItems.
 */
export async function updateEditorItem(file: FileNavigatorItem) {
  const irminCore = await initCore();
  if (file.type === 'folder') {
    const res = await irminCore.editorItemService.updateFolder(file);
    return res;
  }
  const res = await irminCore.editorItemService.updateFile(file);
  return res;
}
