'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to get the list of files and folders in the Workspace's EditorItems.
 *
 * @param props - The properties for the function.
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
