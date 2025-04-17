'use server';

import { initCore } from '@/lib/initCore';

/**
 * Get a single object at a given path.
 *
 * @param props - The properties for the function.
 * @param props.workspace - The workspace slug.
 * @param props.repository - The repository slug.
 * @param props.path - The path of the object.
 * @param props.ref - (optional) The ref (branch, tag or commit hash).
 * @param props.token - Optional user token.
 * @returns The object details.
 */
export async function getObject({
  workspace,
  repository,
  path,
  ref,
  token,
}: {
  workspace: string;
  repository: string;
  path: string;
  ref?: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.getObjectAtPath({
    workspace,
    repository,
    path,
    ref,
  });
  return res;
}
