'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to fetch objects at a given path in a repository and ref.
 *
 * @param repository - Repository slug to fetch objects for
 * @param path - (optional) Path in the repository to fetch objects from
 * @param ref - (optional) Ref to fetch objects from (branch, tag, or commit hash)
 * @param token - (optional) User token
 * @returns The list of objects
 */
export async function getObjects(
  repository: string,
  path: string = '',
  ref?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the objects
  const objects = await irminCore.objectService.fetchObjects(
    repository,
    path,
    ref
  );
  return objects.data;
}

/**
 * Server action to fetch a single object by its name and path in a repository.
 *
 * @param repository - Repository slug
 * @param path - Full path of the object
 * @param ref - (optional) Ref to fetch the object at
 * @param token - (optional) User token
 * @returns The object details
 */
export async function getObject(
  repository: string,
  path: string,
  ref?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  // Get the object
  const object = await irminCore.objectService.fetchObject(
    repository,
    path,
    ref
  );
  return object.data;
}

/**
 * Server action to fetch the schema of an object in a repository at a specific path and ref.
 *
 * @param repository - Repository slug
 * @param path - Path of the object in the repository
 * @param ref - Ref to fetch the schema at
 * @param token - (optional) User token
 * @returns The object schema
 */
export async function getObjectSchema(
  repository: string,
  path: string,
  ref?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.fetchObjectSchema(
    repository,
    path,
    ref
  );
  return res;
}

/**
 * Server action to fetch the content of an object in a repository at a specific path and ref.
 *
 * @param repository - Repository slug
 * @param path - Path of the object in the repository
 * @param ref - (optional) Ref to fetch content at
 * @param token - (optional) User token
 * @returns The object content
 */
export async function getObjectContent(
  repository: string,
  path: string,
  ref?: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.fetchContent(repository, path, ref);
  return res;
}

/**
 * Server action to upload an object to a repository.
 *
 * @param repository - Repository slug
 * @param ref - Ref to upload the object to
 * @param path - Path within the repository (example: /example/path)
 * @param object - Name of the object (example: file.txt)
 * @param files - (optional) Files to upload (leave undefined for group creation)
 * @param token - (optional) User token
 * @returns The created object
 */
export async function uploadObject(
  repository: string,
  ref: string,
  path: string,
  object: string,
  files?: FileList,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.uploadObject(
    repository,
    ref,
    path,
    object,
    files
  );
  return res;
}

/**
 * Server action to move or rename an object in a repository.
 *
 * @param repository - Repository slug
 * @param ref - Ref to move the object in
 * @param path - Current path of the object
 * @param newPath - New path for the object
 * @param token - (optional) User token
 * @returns The moved/renamed object
 */
export async function moveObject(
  repository: string,
  ref: string,
  path: string,
  newPath: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.moveObject(
    repository,
    ref,
    path,
    newPath
  );
  return res;
}

/**
 * Server action to delete an object from a repository.
 *
 * @param repository - Repository slug
 * @param ref - Ref to delete the object from
 * @param path - Path of the object
 * @param object - Name of the object to delete
 * @param token - (optional) User token
 * @returns The deletion result
 */
export async function deleteObject(
  repository: string,
  ref: string,
  path: string,
  object: string,
  token?: string
) {
  const irminCore = await initCore(token);
  const res = await irminCore.objectService.deleteObject(
    repository,
    ref,
    path,
    object
  );
  return res;
}
