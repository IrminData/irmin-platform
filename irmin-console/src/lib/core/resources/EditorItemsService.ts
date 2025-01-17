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
  async fetchEditorItems(): Promise<IrminAPIResponse<EditorItems>> {
    if (isOfflineMode)
      return fake(exampleEditorItems) as IrminAPIResponse<EditorItems>;
    try {
      const response = (await this.irminCore.fetchAPI(`/v1/editor-items`, {
        method: 'GET',
      })) as IrminAPIResponse<EditorItems>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Fetch editorItems error');
      if (isDevelopment)
        return fake(exampleEditorItems) as IrminAPIResponse<EditorItems>;
      throw error;
    }
  }

  /**
   * Create a new file in the editorItems
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   * @param isDraft - whether the file is a draft or not
   */
  async createFile(
    fileNavigatorItem: FileNavigatorItem,
    isDraft?: boolean
  ): Promise<IrminAPIResponse<EditorItemsFile>> {
    if (isOfflineMode)
      return fake(exampleFiles[0]) as IrminAPIResponse<EditorItemsFile>;
    try {
      // Make sure the item is a file
      if (fileNavigatorItem.type !== 'file' || !fileNavigatorItem.current) {
        throw new Error('Item is not a file');
      }
      // Create the file
      const formData = new FormData();
      formData.append('name', fileNavigatorItem.current.name);
      formData.append('path', fileNavigatorItem.current.path);
      formData.append('contents', fileNavigatorItem.current.contents);
      formData.append('extension', fileNavigatorItem.current.type);

      if (isDraft) formData.append('is_draft', 'true');
      else formData.append('is_draft', 'false');

      const response = (await this.irminCore.fetchAPI(
        `/v1/editor-items/files`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<EditorItemsFile>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create file error');
      if (isDevelopment)
        return fake(exampleFiles[0]) as IrminAPIResponse<EditorItemsFile>;
      throw error;
    }
  }

  /**
   * Update a file in the editorItems
   *
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   * @param isDraft - whether the file is a draft or not
   */
  async updateFile(
    fileNavigatorItem: FileNavigatorItem,
    isDraft?: boolean
  ): Promise<IrminAPIResponse<EditorItemsFile>> {
    if (isOfflineMode)
      return fake(exampleFiles[0]) as IrminAPIResponse<EditorItemsFile>;
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
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('name', fileNavigatorItem.current.name);
      formData.append('path', fileNavigatorItem.current.path);
      formData.append('contents', fileNavigatorItem.current.contents);
      formData.append('extension', fileNavigatorItem.current.type);
      formData.append('owner', fileNavigatorItem.current.owner);
      formData.append('original_path', fileNavigatorItem.original.path);
      if (isDraft) formData.append('is_draft', 'true');
      else formData.append('is_draft', 'false');
      const response = (await this.irminCore.fetchAPI(
        `/v1/editor-items/files`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<EditorItemsFile>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update file error');
      if (isDevelopment)
        return fake(exampleFiles[0]) as IrminAPIResponse<EditorItemsFile>;
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
      const formData = new FormData();
      formData.append('_method', 'DELETE');
      formData.append('name', fileNavigatorItem.original.name);
      formData.append('extension', fileNavigatorItem.original.type);
      formData.append('path', fileNavigatorItem.original.path);
      const response = await this.irminCore.fetchAPI(`/v1/editor-items/files`, {
        method: 'POST',
        body: formData,
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
  ): Promise<IrminAPIResponse<EditorItemsFolder>> {
    if (isOfflineMode)
      return fake(exampleFolders[0]) as IrminAPIResponse<EditorItemsFolder>;
    try {
      // Make sure the item is a folder
      if (fileNavigatorItem.type !== 'folder' || !fileNavigatorItem.current) {
        throw new Error('Item is not a folder');
      }
      // Create the folder
      const formData = new FormData();
      formData.append('name', fileNavigatorItem.current.name);
      formData.append('path', fileNavigatorItem.current.path);
      const response = (await this.irminCore.fetchAPI(
        `/v1/editor-items/folders`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<EditorItemsFolder>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Create folder error');
      if (isDevelopment)
        return fake(exampleFolders[0]) as IrminAPIResponse<EditorItemsFolder>;
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
  ): Promise<IrminAPIResponse<EditorItemsFolder>> {
    if (isOfflineMode)
      return fake(exampleFolders[0]) as IrminAPIResponse<EditorItemsFolder>;
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
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      formData.append('name', fileNavigatorItem.current.name);
      formData.append('path', fileNavigatorItem.current.path);
      formData.append('owner', fileNavigatorItem.current.owner);
      formData.append('original_path', fileNavigatorItem.original.path);
      const response = (await this.irminCore.fetchAPI(
        `/v1/editor-items/folders`,
        {
          method: 'POST',
          body: formData,
        }
      )) as IrminAPIResponse<EditorItemsFolder>;
      return response;
    } catch (error) {
      console.error((error as Error).message, 'Update folder error');
      if (isDevelopment)
        return fake(exampleFolders[0]) as IrminAPIResponse<EditorItemsFolder>;
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
