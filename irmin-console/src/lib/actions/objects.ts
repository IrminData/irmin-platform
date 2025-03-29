'use server';

import { initCore } from '@/lib/initCore';

/**
 * Get a single object at a given path.
 *
 * @param workspace - The workspace slug.
 * @param repository - The repository slug.
 * @param path - The path of the object.
 * @param ref - (optional) The ref (branch, tag or commit hash).
 * @param token - Optional user token.
 * @returns The object details.
 */
export async function getObject(
  workspace: string,
  repository: string,
  path: string,
  ref?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.getObjectAtPath({
    workspace,
    repository,
    path,
    ref,
  });
  return res.data;
}

/**
 * Get the history of an object.
 *
 * @param workspace - The workspace identifier.
 * @param repository - The repository identifier.
 * @param path - The path of the object.
 * @param ref - The ref (branch, tag or commit hash).
 * @param token - Optional user token.
 * @returns The list of commits (object history).
 */
export async function getObjectHistory(
  workspace: string,
  repository: string,
  path: string,
  ref?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.getObjectHistory({
    workspace,
    repository,
    path,
    ref,
  });
  return res.data;
}

/**
 * Get the schema of an object.
 *
 * @param workspace - The workspace identifier.
 * @param repository - The repository identifier.
 * @param path - The path of the object.
 * @param ref - The ref for which to fetch the schema.
 * @param token - Optional user token.
 * @returns The object schema.
 */
export async function getObjectSchema(
  workspace: string,
  repository: string,
  path: string,
  ref?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.getObjectSchema({
    workspace,
    repository,
    path,
    ref,
  });
  return res.data;
}

/**
 * Get the binary content of an object.
 *
 * @param workspace - The workspace identifier.
 * @param repository - The repository identifier.
 * @param path - The path of the object.
 * @param ref - (optional) The ref to fetch content at.
 * @param token - (optional) user token.
 * @returns The binary content of the object.
 */
export async function getObjectContent(
  workspace: string,
  repository: string,
  path: string,
  ref?: string,
  token?: string
) {
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
 * @param workspace - The workspace identifier.
 * @param repository - The repository identifier.
 * @param ref - The ref (branch, tag or commit hash) to upload to.
 * @param path - The path within the repository.
 * @param name - The name of the object.
 * @param files - (Optional) Files to upload.
 * @param token - Optional user token.
 * @returns The uploaded object.
 */
export async function uploadObject(
  workspace: string,
  repository: string,
  ref: string,
  path: string,
  name: string,
  files?: FileList,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.uploadObject({
    workspace,
    repository,
    ref,
    path,
    name,
    files,
  });
  return res;
}

/**
 * Move or rename an object.
 *
 * @param workspace - The workspace identifier.
 * @param repository - The repository identifier.
 * @param ref - The ref (branch, tag or commit hash) for the move.
 * @param path - The current path of the object.
 * @param newPath - The new path for the object.
 * @param token - Optional user token.
 * @returns The moved object.
 */
export async function moveObject(
  workspace: string,
  repository: string,
  ref: string,
  path: string,
  newPath: string,
  token?: string
) {
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
 * @param workspace - The workspace identifier.
 * @param repository - The repository identifier.
 * @param ref - The ref (branch, tag or commit hash) for the copy.
 * @param path - The current path of the object.
 * @param newPath - The new path for the copied object.
 * @param token - Optional user token.
 * @returns The copied object.
 */
export async function copyObject(
  workspace: string,
  repository: string,
  ref: string,
  path: string,
  newPath: string,
  token?: string
) {
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
 * @param workspace - The workspace identifier.
 * @param repository - The repository identifier.
 * @param ref - The ref (branch, tag or commit hash) to delete from.
 * @param path - The path of the object.
 * @param token - Optional user token.
 * @returns The deletion result.
 */
export async function deleteObject(
  workspace: string,
  repository: string,
  ref: string,
  path: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.deleteObject({
    workspace,
    repository,
    ref,
    path,
  });
  return res;
}
