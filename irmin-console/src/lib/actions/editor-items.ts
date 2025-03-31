'use server';

import { initCore } from '@/lib/initCore';

import { EditorItem } from '@/types/core/EditorItems';

/**
 * Server action to get the list of files and folders in the Workspace's EditorItems.
 *
 * @param props.workspace - The workspace slug.
 * @param props.path - The path within the editor.
 * @param props.token - Optional token for authentication.
 * @returns The list of editor items.
 */
export async function getEditorItems({
  workspace,
  path,
  token,
}: {
  workspace: string;
  path: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the editor items using the listEditorItems method
  const editorItemsResponse = await irminCore.editorItemService.listEditorItems(
    {
      workspace,
      path,
    }
  );
  return editorItemsResponse;
}

/**
 * Server action to get the content of a file in the Workspace's EditorItems.
 *
 * @param props.workspace - The workspace slug.
 * @param props.path - The path of the file within the editor.
 * @param props.token - Optional token for authentication.
 * @returns The content of the editor item.
 */
export async function getEditorItemContent({
  workspace,
  path,
  token,
}: {
  workspace: string;
  path: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Get the editor item content using getEditorItemContent
  const editorItemContentResponse =
    await irminCore.editorItemService.getEditorItemContent({
      workspace,
      path,
    });
  return editorItemContentResponse;
}

/**
 * Server action to move a file or folder in the Workspace's EditorItems.
 *
 * @param props.workspace - The workspace slug.
 * @param props.item - The file or folder information to be moved.
 * @param props.destinationPath - The destination path where the item should be moved.
 * @param props.token - Optional token for authentication.
 * @returns The API response for the move operation.
 */
export async function moveEditorItem({
  workspace,
  item,
  destinationPath,
  token,
}: {
  workspace: string;
  item: EditorItem;
  destinationPath: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.editorItemService.moveEditorItem({
    workspace,
    path: item.path,
    destinationPath,
  });
  return res;
}

/**
 * Server action to copy a file or folder in the Workspace's EditorItems.
 *
 * @param props.workspace - The workspace slug.
 * @param props.item - The file or folder information to be copied.
 * @param props.destinationPath - The destination path where the item should be copied.
 * @param props.token - Optional token for authentication.
 * @returns The API response for the copy operation.
 */
export async function copyEditorItem({
  workspace,
  item,
  destinationPath,
  token,
}: {
  workspace: string;
  item: EditorItem;
  destinationPath: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.editorItemService.copyEditorItem({
    workspace,
    path: item.path,
    destinationPath,
  });
  return res;
}

/**
 * Server action to delete a file or folder in the Workspace's EditorItems.
 *
 * @param props.workspace - The workspace slug.
 * @param props.item - The file or folder information to be deleted.
 * @param props.token - Optional token for authentication.
 * @returns The API response for the deletion operation.
 */
export async function deleteEditorItem({
  workspace,
  item,
  token,
}: {
  workspace: string;
  item: EditorItem;
  token?: string;
}) {
  const irminCore = await initCore(token);
  // Delete the item using deleteEditorItem
  const res = await irminCore.editorItemService.deleteEditorItem({
    workspace,
    path: item.path,
  });
  return res;
}

/**
 * Server action to save a file in the Workspace's EditorItems.
 *
 * @param props.workspace - The workspace slug.
 * @param props.item - The file information to be saved.
 * @param props.token - Optional token for authentication.
 * @returns The API response for the save operation.
 */
export async function saveEditorItem({
  workspace,
  item,
  token,
}: {
  workspace: string;
  item: EditorItem;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.editorItemService.saveEditorItem({
    workspace,
    path: item.path,
    content: item.content ?? '',
  });
  return res;
}

/**
 * Server action to create a new file in the Workspace's EditorItems.
 *
 * @param props.workspace - The workspace slug.
 * @param props.item - The file information to be created.
 * @param props.token - Optional token for authentication.
 * @returns The API response for the creation operation.
 */
export async function createEditorFolder({
  workspace,
  item,
  token,
}: {
  workspace: string;
  item: EditorItem;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.editorItemService.createEditorFolder({
    workspace,
    path: item.path,
  });
  return res;
}
