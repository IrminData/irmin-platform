import { defaultLocale, Locale } from '@/dictionaries';
import {
  exampleAPIResponse,
  exampleBucket,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { Bucket } from '@/types/api/Bucket';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const isDevelopment =
  process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE === 'development';

const api_base = process.env.NEXT_PUBLIC_API_URL;

/**
 * Bucket API response type
 * @internal
 */
interface BucketAPIResponse extends IrminAPIResponse {
  data: Bucket;
}

/**
 * Bucket API service
 *
 * @remarks
 *
 * This service calls the Irmin API and is responsible for all bucket related API calls.
 *
 * Like the other API services, this service is a singleton, meaning that only one
 * instance of the service can exist at a time.
 *
 * The service uses the {@link fetchWithCredentials} function to make API calls.
 *
 * If the environment is set to offline mode, service will return example data instead
 * of making API calls.
 *
 * If the environment is set to development, service will log the API call errors to
 * the console, but will not throw them. Instead, it will return the example data.
 *
 * Example data can be found here: `@/lib/exampleObjects/apiObjects`
 */
class BucketService {
  private static instance: BucketService;
  private locale: Locale = defaultLocale;

  private constructor(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get the instance of the {@link BucketService}
   * @param locale - The locale to use for the instance
   */
  public static getInstance(locale: Locale): BucketService {
    if (!BucketService.instance) {
      BucketService.instance = new BucketService(locale);
    } else {
      // Update the locale if the instance already exists
      BucketService.instance.setLocale(locale);
    }
    return BucketService.instance;
  }

  /**
   * Set the locale for the instance
   * @param locale - The locale to set
   */
  public setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Fetch the bucket for the current workspace
   * @todo Provide link to Irmin API docs
   * @returns response from the API or example data
   */
  async fetchBucket(): Promise<BucketAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: exampleBucket,
      };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/bucket`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.locale
      )) as BucketAPIResponse;
      return response;
    } catch (error) {
      console.error('Fetch bucket error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: exampleBucket,
        };
      throw error;
    }
  }

  /**
   * Create a new file in the bucket
   * @todo Provide link to Irmin API docs
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   * @returns response from the API or example data
   */
  async createFile(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
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
      const response = await fetchWithCredentials(
        `${api_base}/v1/buckets/files`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Create file error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Update a file in the bucket
   * @todo Provide link to Irmin API docs
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   * @returns response from the API or example data
   */
  async updateFile(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
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
      const response = await fetchWithCredentials(
        `${api_base}/v1/buckets/files`,
        {
          method: 'POST',
          body,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Update file error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a file from the bucket
   * @todo Provide link to Irmin API docs
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   * @returns response from the API or void
   */
  async deleteFile(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
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
      const response = await fetchWithCredentials(
        `${api_base}/v1/buckets/files`,
        {
          method: 'POST',
          body,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Delete file error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Create a new folder in the bucket
   * @todo Provide link to Irmin API docs
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   * @returns response from the API or example data
   */
  async createFolder(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
    try {
      // Make sure the item is a folder
      if (fileNavigatorItem.type !== 'folder' || !fileNavigatorItem.current) {
        throw new Error('Item is not a folder');
      }
      // Create the folder
      const body = new FormData();
      body.append('name', fileNavigatorItem.current.name);
      body.append('path', fileNavigatorItem.current.path);
      const response = await fetchWithCredentials(
        `${api_base}/v1/buckets/folders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Create folder error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Update a folder in the bucket
   * @todo Provide link to Irmin API docs
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   * @returns response from the API or example data
   */
  async updateFolder(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
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
      const response = await fetchWithCredentials(
        `${api_base}/v1/buckets/folders`,
        {
          method: 'POST',
          body,
        },
        this.locale
      );

      return response;
    } catch (error) {
      console.error('Update folder error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }

  /**
   * Delete a folder from the bucket
   * @todo Provide link to Irmin API docs
   * @param fileNavigatorItem - the file navigator item to update, containing the original and updated file objects
   * @returns response from the API or void
   */
  async deleteFolder(
    fileNavigatorItem: FileNavigatorItem
  ): Promise<IrminAPIResponse> {
    if (isOfflineMode) return exampleAPIResponse;
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
      const response = await fetchWithCredentials(
        `${api_base}/v1/buckets/folders`,
        {
          method: 'POST',
          body,
        },
        this.locale
      );
      return response;
    } catch (error) {
      console.error('Delete folder error:', error);
      if (isDevelopment) return exampleAPIResponse;
      throw error;
    }
  }
}

export default BucketService;
