'use server';

import { initCore } from '@/lib/initCore';

import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Server action to get the list of files and folders in the Workspace's EditorItems.
 *
 * @returns The EditorItems object
 */
export async function getEditorItems(token?: string) {
  const irminCore = await initCore(token);
  // Get the editorItems
  const editorItems = await irminCore.editorItemService.fetchEditorItems();
  return editorItems.data;
}

/**
 * Server action to create a file or folder in the Workspace's EditorItems.
 */
export async function createEditorItem(
  file: FileNavigatorItem,
  isDraft?: boolean,
  token?: string
) {
  const irminCore = await initCore(token);
  if (file.type === 'folder') {
    const res = await irminCore.editorItemService.createFolder(file);
    return res;
  }
  const res = await irminCore.editorItemService.createFile(file, isDraft);
  return res;
}

/**
 * Server action to delete a file or folder in the Workspace's EditorItems.
 */
export async function deleteEditorItem(
  file: FileNavigatorItem,
  token?: string
) {
  const irminCore = await initCore(token);
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
export async function updateEditorItem(
  file: FileNavigatorItem,
  isDraft?: boolean,
  token?: string
) {
  const irminCore = await initCore(token);
  if (file.type === 'folder') {
    const res = await irminCore.editorItemService.updateFolder(file);
    return res;
  }
  const res = await irminCore.editorItemService.updateFile(file, isDraft);
  return res;
}
