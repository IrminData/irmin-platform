import IrminCore from '@/services/core/IrminCore';

import fake from '@/utils/prepareFakeResponse';

import { Bucket } from '@/types/core/Bucket';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { exampleBucket } from '@/types/examples/core';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Bucket API response type
 */
interface BucketAPIResponse extends IrminAPIResponse {
  data: Bucket;
}

/**
 * Bucket API service
 *
 * Responsible for all bucket related API calls.
 */
class BucketService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchBucket = this.fetchBucket.bind(this);
    this.createFile = this.createFile.bind(this);
    this.updateFile = this.updateFile.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.createFolder = this.createFolder.bind(this);
    this.updateFolder = this.updateFolder.bind(this);
    this.deleteFolder = this.deleteFolder.bind(this);
  }

  /**
   * Fetch the bucket for the current workspace
   */
  async fetchBucket(): Promise<BucketAPIResponse> {
    if (isOfflineMode) return fake(exampleBucket) as BucketAPIResponse;
    try {
      const response = (await this.irminCore.fetch(`/v1/bucket`, {
        method: 'GET',
      })) as BucketAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch bucket error');
      if (isDevelopment) return fake(exampleBucket) as BucketAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new file in the bucket
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async createFile(fileNavigatorItem: FileNavigatorItem) {
    if (isOfflineMode) return fake();
    try {
      // Make sure the item is a file
      if (fileNavigatorItem.type !== 'file' || !fileNavigatorItem.current) {
        throw new Error('Item is not a file');
      }
      // Create the file
      const body = new FormData();
      body.append('name', fileNavigatorItem.current.name);
      body.append('path', fileNavigatorItem.current.path);
      body.append('contents', fileNavigatorItem.current.contents);
      const response = await this.irminCore.fetch(`/v1/buckets/files/create`, {
        method: 'POST',
        body,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create file error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Update a file in the bucket
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async updateFile(fileNavigatorItem: FileNavigatorItem) {
    if (isOfflineMode) return fake();
    try {
      // Make sure the item is a file
      if (
        fileNavigatorItem.type !== 'file' ||
        !fileNavigatorItem.current ||
        !fileNavigatorItem.original
      ) {
        throw new Error('Item is not a file');
      }
      // Update the file
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('name', fileNavigatorItem.current.name);
      body.append('path', fileNavigatorItem.current.path);
      body.append('contents', fileNavigatorItem.current.contents);
      body.append('original_path', fileNavigatorItem.original.path);
      body.append('original_contents', fileNavigatorItem.original.contents);
      const response = await this.irminCore.fetch(`/v1/buckets/files`, {
        method: 'POST',
        body,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update file error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Delete a file from the bucket
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async deleteFile(fileNavigatorItem: FileNavigatorItem) {
    if (isOfflineMode) return fake();
    try {
      // Make sure the item is a file
      if (fileNavigatorItem.type !== 'file' || !fileNavigatorItem.original) {
        throw new Error('Item is not a file');
      }
      // Delete the file
      const body = new FormData();
      body.append('_method', 'DELETE');
      body.append('name', fileNavigatorItem.original.name);
      body.append('path', fileNavigatorItem.original.path);
      const response = await this.irminCore.fetch(`/v1/buckets/files`, {
        method: 'POST',
        body,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete file error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Create a new folder in the bucket
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async createFolder(fileNavigatorItem: FileNavigatorItem) {
    if (isOfflineMode) return fake();
    try {
      // Make sure the item is a folder
      if (fileNavigatorItem.type !== 'folder' || !fileNavigatorItem.current) {
        throw new Error('Item is not a folder');
      }
      // Create the folder
      const body = new FormData();
      body.append('name', fileNavigatorItem.current.name);
      body.append('path', fileNavigatorItem.current.path);
      const response = await this.irminCore.fetch(
        `/v1/buckets/folders/create`,
        {
          method: 'POST',
          body,
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create folder error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Update a folder in the bucket
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async updateFolder(fileNavigatorItem: FileNavigatorItem) {
    if (isOfflineMode) return fake();
    try {
      // Make sure the item is a folder
      if (
        fileNavigatorItem.type !== 'folder' ||
        !fileNavigatorItem.current ||
        !fileNavigatorItem.original
      ) {
        throw new Error('Item is not a folder');
      }
      // Update the folder
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('name', fileNavigatorItem.current.name);
      body.append('path', fileNavigatorItem.current.path);
      body.append('original_path', fileNavigatorItem.original.path);
      const response = await this.irminCore.fetch(`/v1/buckets/folders`, {
        method: 'POST',
        body,
      });

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update folder error');
      if (isDevelopment) return fake();
      throw error;
    }
  }

  /**
   * Delete a folder from the bucket
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async deleteFolder(fileNavigatorItem: FileNavigatorItem) {
    if (isOfflineMode) return fake();
    try {
      // Make sure the item is a folder
      if (fileNavigatorItem.type !== 'folder' || !fileNavigatorItem.original) {
        throw new Error('Item is not a folder');
      }
      // Delete the folder
      const body = new FormData();
      body.append('_method', 'DELETE');
      body.append('name', fileNavigatorItem.original.name);
      body.append('path', fileNavigatorItem.original.path);
      const response = await this.irminCore.fetch(`/v1/buckets/folders`, {
        method: 'POST',
        body,
      });
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete folder error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default BucketService;
