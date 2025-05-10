import { getRepositories } from '@/lib/actions/repositories';
import { getToken } from '@/lib/getToken';

import EditorSection from '@/components/editor/EditorSection';

import { WorkspaceLayoutParams } from '../layout';

/**
 * Editor page, used to edit files in the Workspace's EditorItems
 *
 * This is just a page route that contains the {@link EditorSection} component
 */
export default async function EditorPage(props: {
  params: Promise<WorkspaceLayoutParams>;
}) {
  const params = await props.params;
  const token = await getToken();
  const repositories = await getRepositories({
    workspace: params.workspace,
    token,
  });
  return <EditorSection repositories={repositories.data ?? []} />;
}
