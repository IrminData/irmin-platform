import { EditorItems } from '@/types/core/EditorItems';

import { files } from './files';
import { folders } from './folders';

/**
 * Get example Workspace EditorItems object
 *
 * Type: {@link EditorItems}
 */
export const editorItems: () => EditorItems = () => ({
  workspace: 'example-workspace',
  folders: folders(),
  files: files(),
});
