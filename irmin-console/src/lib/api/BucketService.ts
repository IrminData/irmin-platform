import { defaultLocale, Locale } from '@/dictionaries';
import {
  exampleAPIResponse,
  exampleBucket,
  exampleFileJS,
  exampleFileSQL,
  exampleFolder,
} from '@/lib/exampleObjects/apiObjects';
import { fetchWithCredentials } from '@/lib/fetchWithCredentials';

import { Bucket, BucketFile, BucketFolder } from '@/types/api/Bucket';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

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
 * Bucket file API response type
 * @internal
 */
interface BucketFileAPIResponse extends IrminAPIResponse {
  data: BucketFile;
}

/**
 * Bucket folder API response type
 * @internal
 */
interface BucketFolderAPIResponse extends IrminAPIResponse {
  data: BucketFolder;
}

const exampleFiles = [exampleFileJS, exampleFileSQL];
const randomExampleFile = () =>
  exampleFiles[Math.floor(Math.random() * exampleFiles.length)];

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
  private bucket: Bucket | null = null;

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
   * TODO: Provide link to Irmin API docs
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
      this.bucket = response.data;
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
   * Get the current stored bucket
   * @returns the stored bucket or null if not fetched yet
   */
  getBucket(): Bucket | null {
    return this.bucket;
  }

  /**
   * Create a new file in the bucket
   * TODO: Provide link to Irmin API docs
   * @param file - the file to create
   * @returns response from the API or example data
   */
  async createFile(file: BucketFile): Promise<BucketFileAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: randomExampleFile(),
      };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/buckets/files`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(file),
        },
        this.locale
      )) as BucketFileAPIResponse;
      this.bucket?.files.push(response.data);
      return response;
    } catch (error) {
      console.error('Create file error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: randomExampleFile(),
        };
      throw error;
    }
  }

  /**
   * Update a file in the bucket
   * TODO: Provide link to Irmin API docs
   * @param file - the file to update
   * @returns response from the API or example data
   */
  async updateFile(file: BucketFile): Promise<BucketFileAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: randomExampleFile(),
      };
    try {
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('file', JSON.stringify(file));

      const response = (await fetchWithCredentials(
        `${api_base}/v1/buckets/files/${file.id}`,
        {
          method: 'POST',
          body,
        },
        this.locale
      )) as BucketFileAPIResponse;

      const index = this.bucket?.files.findIndex((f) => f.id === file.id);
      if (index !== undefined && index !== -1) {
        this.bucket!.files[index] = response.data;
      }
      return response;
    } catch (error) {
      console.error('Update file error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: randomExampleFile(),
        };
      throw error;
    }
  }

  /**
   * Delete a file from the bucket
   * TODO: Provide link to Irmin API docs
   * @param fileId - the ID of the file to delete
   * @returns response from the API or example data
   */
  async deleteFile(fileId: number): Promise<void> {
    if (isOfflineMode) return;
    try {
      const body = new FormData();
      body.append('_method', 'DELETE');

      await fetchWithCredentials(
        `${api_base}/v1/buckets/files/${fileId}`,
        {
          method: 'POST',
          body,
        },
        this.locale
      );
      this.bucket!.files = this.bucket!.files.filter((f) => f.id !== fileId);
    } catch (error) {
      console.error('Delete file error:', error);
      if (isDevelopment) return;
      throw error;
    }
  }

  /**
   * Create a new folder in the bucket
   * TODO: Provide link to Irmin API docs
   * @param folder - the folder to create
   * @returns response from the API or example data
   */
  async createFolder(folder: BucketFolder): Promise<BucketFolderAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: exampleFolder,
      };
    try {
      const response = (await fetchWithCredentials(
        `${api_base}/v1/buckets/folders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(folder),
        },
        this.locale
      )) as BucketFolderAPIResponse;
      this.bucket?.folders.push(response.data);
      return response;
    } catch (error) {
      console.error('Create folder error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: exampleFolder,
        };
      throw error;
    }
  }

  /**
   * Update a folder in the bucket
   * TODO: Provide link to Irmin API docs
   * @param folder - the folder to update
   * @returns response from the API or example data
   */
  async updateFolder(folder: BucketFolder): Promise<BucketFolderAPIResponse> {
    if (isOfflineMode)
      return {
        ...exampleAPIResponse,
        data: exampleFolder,
      };
    try {
      const body = new FormData();
      body.append('_method', 'PUT');
      body.append('folder', JSON.stringify(folder));

      const response = (await fetchWithCredentials(
        `${api_base}/v1/buckets/folders/${folder.id}`,
        {
          method: 'POST',
          body,
        },
        this.locale
      )) as BucketFolderAPIResponse;

      const index = this.bucket?.folders.findIndex((f) => f.id === folder.id);
      if (index !== undefined && index !== -1) {
        this.bucket!.folders[index] = response.data;
      }
      return response;
    } catch (error) {
      console.error('Update folder error:', error);
      if (isDevelopment)
        return {
          ...exampleAPIResponse,
          data: exampleFolder,
        };
      throw error;
    }
  }

  /**
   * Delete a folder from the bucket
   * TODO: Provide link to Irmin API docs
   * @param folderId - the ID of the folder to delete
   * @returns response from the API or example data
   */
  async deleteFolder(folderId: number): Promise<void> {
    if (isOfflineMode) return;
    try {
      const body = new FormData();
      body.append('_method', 'DELETE');

      await fetchWithCredentials(
        `${api_base}/v1/buckets/folders/${folderId}`,
        {
          method: 'POST',
          body,
        },
        this.locale
      );
      this.bucket!.folders = this.bucket!.folders.filter(
        (f) => f.id !== folderId
      );
    } catch (error) {
      console.error('Delete folder error:', error);
      if (isDevelopment) return;
      throw error;
    }
  }
}

export default BucketService;
