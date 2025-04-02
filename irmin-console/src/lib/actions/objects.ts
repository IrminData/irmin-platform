'use server';

import { initCore } from '@/lib/initCore';

/**
 * Get a single object at a given path.
 *
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

/**
 * Get the history of an object.
 *
 * @param props.workspace - The workspace identifier.
 * @param props.repository - The repository identifier.
 * @param props.path - The path of the object.
 * @param props.ref - The ref (branch, tag or commit hash).
 * @param props.token - Optional user token.
 * @returns The list of commits (object history).
 */
export async function getObjectHistory({
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
  const res = await irminCore.objectService.getObjectHistory({
    workspace,
    repository,
    path,
    ref,
  });
  return res;
}

/**
 * Get the schema of an object.
 *
 * @param props.workspace - The workspace identifier.
 * @param props.repository - The repository identifier.
 * @param props.path - The path of the object.
 * @param props.ref - The ref for which to fetch the schema.
 * @param props.token - Optional user token.
 * @returns The object schema.
 */
export async function getObjectSchema({
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
  const res = await irminCore.objectService.getObjectSchema({
    workspace,
    repository,
    path,
    ref,
  });
  return res;
}

/**
 * Get the binary content of an object.
 *
 * @param props.workspace - The workspace identifier.
 * @param props.repository - The repository identifier.
 * @param props.path - The path of the object.
 * @param props.ref - (optional) The ref to fetch content at.
 * @param props.token - (optional) user token.
 * @returns The binary content of the object.
 */
export async function getObjectContent({
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
  const res = await irminCore.objectService.getObjectContent({
    workspace,
    repository,
    path,
    ref,
  });
  return res;
}

/**
 * Upload an object to a repository.
 *
 * @param props.workspace - The workspace identifier.
 * @param props.repository - The repository identifier.
 * @param props.ref - The ref (branch, tag or commit hash) to upload to.
 * @param props.path - The path within the repository.
 * @param props.name - The name of the object.
 * @param props.files - (Optional) Files to upload.
 * @param props.token - Optional user token.
 * @returns The uploaded object.
 */
export async function uploadObject({
  workspace,
  repository,
  ref,
  path,
  files,
  token,
}: {
  workspace: string;
  repository: string;
  ref: string;
  path: string;
  files?: FileList;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.uploadObject({
    workspace,
    repository,
    ref,
    path,
    files,
  });
  return res;
}

/**
 * Move or rename an object.
 *
 * @param props.workspace - The workspace identifier.
 * @param props.repository - The repository identifier.
 * @param props.ref - The ref (branch, tag or commit hash) for the move.
 * @param props.path - The current path of the object.
 * @param props.newPath - The new path for the object.
 * @param props.token - Optional user token.
 * @returns The moved object.
 */
export async function moveObject({
  workspace,
  repository,
  ref,
  path,
  newPath,
  token,
}: {
  workspace: string;
  repository: string;
  ref: string;
  path: string;
  newPath: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.moveObject({
    workspace,
    repository,
    ref,
    path,
    newPath,
  });
  return res;
}

/**
 * Copy an object.
 *
 * @param props.workspace - The workspace identifier.
 * @param props.repository - The repository identifier.
 * @param props.ref - The ref (branch, tag or commit hash) for the copy.
 * @param props.path - The current path of the object.
 * @param props.newPath - The new path for the copied object.
 * @param props.token - Optional user token.
 * @returns The copied object.
 */
export async function copyObject({
  workspace,
  repository,
  ref,
  path,
  newPath,
  token,
}: {
  workspace: string;
  repository: string;
  ref: string;
  path: string;
  newPath: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.copyObject({
    workspace,
    repository,
    ref,
    path,
    newPath,
  });
  return res;
}

/**
 * Delete an object from a repository.
 *
 * @param props.workspace - The workspace identifier.
 * @param props.repository - The repository identifier.
 * @param props.ref - The ref (branch, tag or commit hash) to delete from.
 * @param props.path - The path of the object.
 * @param props.token - Optional user token.
 * @returns The deletion result.
 */
export async function deleteObject({
  workspace,
  repository,
  ref,
  path,
  token,
}: {
  workspace: string;
  repository: string;
  ref: string;
  path: string;
  token?: string;
}) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.deleteObject({
    workspace,
    repository,
    ref,
    path,
  });
  return res;
}
