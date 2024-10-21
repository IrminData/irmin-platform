'use server';

import { initCore } from '@/lib/initCore';

import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Server action to get the list of files and folders in the Workspace's Bucket.
 *
 * @returns The Bucket object
 */
export async function getBucket() {
  // Create the IrminCore instance
  const irminCore = await initCore();
  // Get the bucket
  const bucket = await irminCore.bucketService.fetchBucket();
  return bucket.data;
}

/**
 * Server action to create a file or folder in the Workspace's Bucket.
 */
export async function createBucketItem(file: FileNavigatorItem) {
  const irminCore = await initCore();
  if (file.type === 'folder') {
    const res = await irminCore.bucketService.createFolder(file);
    return res;
  }
  const res = await irminCore.bucketService.createFile(file);
  return res;
}

/**
 * Server action to delete a file or folder in the Workspace's Bucket.
 */
export async function deleteBucketItem(file: FileNavigatorItem) {
  const irminCore = await initCore();
  if (file.type === 'folder') {
    const res = await irminCore.bucketService.deleteFolder(file);
    return res;
  }
  const res = await irminCore.bucketService.deleteFile(file);
  return res;
}

/**
 * Server action to update a file or folder in the Workspace's Bucket.
 */
export async function updateBucketItem(file: FileNavigatorItem) {
  const irminCore = await initCore();
  if (file.type === 'folder') {
    const res = await irminCore.bucketService.updateFolder(file);
    return res;
  }
  const res = await irminCore.bucketService.updateFile(file);
  return res;
}
