/**
 * Interface for defining the data in a file collection.
 *
 * @typeParam type - Type of the data, always 'file' for FileCollectionData
 * @typeParam content - Content of the file
 */
export interface FileCollectionData {
  type: 'file';
  content: string | ArrayBuffer | Blob | null;
}

/**
 * Interface for defining the schema of a file (e.g., an image, video, ...)
 *
 * @typeParam type - Type of the schema, always 'file' for FileSchema
 * @typeParam name - The name of the file, including the extension (e.g., image.jpg)
 * @typeParam size - Size of the file in bytes
 * @typeParam extension - File extension (e.g., jpg, mp4, pdf)
 * @typeParam created_at - Creation timestamp
 * @typeParam modified_at - Last modification timestamp
 * @typeParam metadata - Optional: Additional metadata (e.g., dimensions for images)
 */
export interface FileSchema {
  type: 'file';
  name: string;
  size: number;
  extension: string;
  created_at: string;
  modified_at: string;
  metadata?: Record<string, string | number | boolean>;
}
