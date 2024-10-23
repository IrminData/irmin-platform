import IrminCore from '@/lib/core';

import fake from '@/utils/prepareFakeResponse';

import {
  EditorItems,
  EditorItemsFile,
  EditorItemsFolder,
} from '@/types/core/EditorItems';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import {
  exampleEditorItems,
  exampleFiles,
  exampleFolders,
} from '@/types/examples/core';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * EditorItems API response type
 */
interface EditorItemsAPIResponse extends IrminAPIResponse {
  data: EditorItems;
}

/**
 * EditorFolder API response type
 */
interface EditorFolderAPIResponse extends IrminAPIResponse {
  data: EditorItemsFolder;
}

/**
 * EditorFile API response type
 */
interface EditorFileAPIResponse extends IrminAPIResponse {
  data: EditorItemsFile;
}

/**
 * EditorItems API service
 *
 * Responsible for all editorItems related API calls.
 */
class EditorItemsService {
  private irminCore: IrminCore;

  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.fetchEditorItems = this.fetchEditorItems.bind(this);
    this.createFile = this.createFile.bind(this);
    this.updateFile = this.updateFile.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.createFolder = this.createFolder.bind(this);
    this.updateFolder = this.updateFolder.bind(this);
    this.deleteFolder = this.deleteFolder.bind(this);
  }

  /**
   * Fetch the editorItems for the current workspace
   */
  async fetchEditorItems(): Promise<EditorItemsAPIResponse> {
    if (isOfflineMode)
      return fake(exampleEditorItems) as EditorItemsAPIResponse;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/editor-items`, {
        method: 'GET',
      })) as EditorItemsAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch editorItems error');
      if (isDevelopment)
        return fake(exampleEditorItems) as EditorItemsAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new file in the editorItems
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async createFile(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<EditorFileAPIResponse> {
    if (isOfflineMode) return fake(exampleFiles[0]) as EditorFileAPIResponse;
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
      const response = (await this.irminCore.fetchAPI(
        `/v1/editor-items/files`,
        {
          method: 'POST',
          body,
        }
      )) as EditorFileAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create file error');
      if (isDevelopment) return fake(exampleFiles[0]) as EditorFileAPIResponse;
      throw error;
    }
  }

  /**
   * Update a file in the editorItems
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async updateFile(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<EditorFileAPIResponse> {
    if (isOfflineMode) return fake(exampleFiles[0]) as EditorFileAPIResponse;
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
      body.append('_method', 'PATCH');
      body.append('name', fileNavigatorItem.current.name);
      body.append('path', fileNavigatorItem.current.path);
      body.append('contents', fileNavigatorItem.current.contents);
      body.append('original_path', fileNavigatorItem.original.path);
      const response = (await this.irminCore.fetchAPI(
        `/v1/editor-items/files`,
        {
          method: 'POST',
          body,
        }
      )) as EditorFileAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update file error');
      if (isDevelopment) return fake(exampleFiles[0]) as EditorFileAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a file from the editorItems
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async deleteFile(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<IrminAPIResponse> {
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
      const response = await this.irminCore.fetchAPI(`/v1/editor-items/files`, {
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
   * Create a new folder in the editorItems
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async createFolder(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<EditorFolderAPIResponse> {
    if (isOfflineMode)
      return fake(exampleFolders[0]) as EditorFolderAPIResponse;
    try {
      // Make sure the item is a folder
      if (fileNavigatorItem.type !== 'folder' || !fileNavigatorItem.current) {
        throw new Error('Item is not a folder');
      }
      // Create the folder
      const body = new FormData();
      body.append('name', fileNavigatorItem.current.name);
      body.append('path', fileNavigatorItem.current.path);
      const response = (await this.irminCore.fetchAPI(
        `/v1/editor-items/folders`,
        {
          method: 'POST',
          body,
        }
      )) as EditorFolderAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create folder error');
      if (isDevelopment)
        return fake(exampleFolders[0]) as EditorFolderAPIResponse;
      throw error;
    }
  }

  /**
   * Update a folder in the editorItems
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async updateFolder(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<EditorFolderAPIResponse> {
    if (isOfflineMode)
      return fake(exampleFolders[0]) as EditorFolderAPIResponse;
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
      body.append('_method', 'PATCH');
      body.append('name', fileNavigatorItem.current.name);
      body.append('path', fileNavigatorItem.current.path);
      body.append('original_path', fileNavigatorItem.original.path);
      const response = (await this.irminCore.fetchAPI(
        `/v1/editor-items/folders`,
        {
          method: 'POST',
          body,
        }
      )) as EditorFolderAPIResponse;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update folder error');
      if (isDevelopment)
        return fake(exampleFolders[0]) as EditorFolderAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a folder from the editorItems
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   */
  async deleteFolder(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<IrminAPIResponse> {
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
      const response = await this.irminCore.fetchAPI(
        `/v1/editor-items/folders`,
        {
          method: 'POST',
          body,
        }
      );
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Delete folder error');
      if (isDevelopment) return fake();
      throw error;
    }
  }
}

export default EditorItemsService;
