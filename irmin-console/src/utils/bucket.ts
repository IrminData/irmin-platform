import { Dictionary } from '@/dictionaries';

import {
  Bucket,
  BucketFile,
  BucketFolder,
  IrminFileType,
  irminFileTypes,
} from '@/types/core/Bucket';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * Format the file or folder name
 * Make sure the name is alphanumeric and has the correct extension
 * @param name The name of the file
 * @param type The type of the object (file or folder)
 * @param desiredExtension The desired extension of the file
 * @returns The correct name with extension and without extension
 */
export const getCorrectNameWithExtension = (
  name: string,
  type: 'file' | 'folder',
  desiredExtension?: IrminFileType
): string => {
  // Remove all existing extensions from the name, regex searching .sql, .js, .py, .php and (.*) and replacing with empty string
  const nameWithoutExtensions = name.replace(/\.(sql|js|py|php)(.*)$/, '');
  // Replace all non-alphanumeric characters with underscores, except for dots
  const formattedName = nameWithoutExtensions
    .replace(/[^a-zA-Z0-9.]/g, '_')
    .trim();
  // Skip if not a file
  if (type !== 'file') return formattedName;
  // Add extension to the name
  return `${formattedName}.${desiredExtension ?? 'sql'}`;
};

export const getNameWithoutExtension = (name: string): string => {
  // Remove all existing extensions from the name, regex searching .sql, .js, .py, .php and (.*) and replacing with empty string
  const nameWithoutExtensions = name.replace(/\.(sql|js|py|php)(.*)$/, '');

  return nameWithoutExtensions;
};

/**
 * Make sure the item can be created before creating it
 * Runs a series of checks to make sure the item can be created
 * @param path The path of the item being created
 * @param name The name of the item being created
 * @param type The type of the item being created (file or folder)
 * @param bucket The bucket object
 * @param dict The dictionary object
 * @param extension The extension of the file being created, if file (optional)
 * @returns Whether the item can be created and the reason if it cannot
 */
export const itemCanBeCreated = function (
  path: string,
  name: string,
  type: string,
  bucket: Bucket | null,
  dict: Dictionary,
  extension?: string
): {
  canCreate: boolean;
  reason?: string;
} {
  // Make sure bucket is provided
  if (!bucket)
    return { canCreate: false, reason: dict.fileNavigator.errors.noBucket };
  // Make sure type of item created is correct
  if (type !== 'file' && type !== 'folder')
    return { canCreate: false, reason: dict.fileNavigator.errors.invalidType };
  // Make sure extension is provided, if file
  if (type === 'file' && !extension)
    return { canCreate: false, reason: dict.fileNavigator.errors.noExtension };
  // Make sure extension is valid, if file
  if (type === 'file' && !irminFileTypes.find((a) => a.extension === extension))
    return {
      canCreate: false,
      reason: dict.fileNavigator.errors.invalidExtension,
    };
  // Make sure name is correct and not empty
  const nameWithoutExtensions = name.replace(/\..*$/, '');
  if (nameWithoutExtensions.length === 0)
    return { canCreate: false, reason: dict.fileNavigator.errors.emptyName };
  if (nameWithoutExtensions.length > 255)
    return { canCreate: false, reason: dict.fileNavigator.errors.longName };
  // Make sure name is correct
  const correctName = getCorrectNameWithExtension(
    name,
    type,
    extension as IrminFileType
  );
  if (correctName !== name)
    return { canCreate: false, reason: dict.fileNavigator.errors.invalidName };
  // Make sure path is correct
  const correctPath = getCorrectPath(path, correctName);
  if (correctPath !== path)
    return { canCreate: false, reason: dict.fileNavigator.errors.invalidPath };
  // Make sure that the path is not already taken
  if (
    bucket.files.some((file) => file.path === correctPath) ||
    bucket.folders.some((folder) => folder.path === correctPath)
  )
    return { canCreate: false, reason: dict.fileNavigator.errors.pathExists };
  // Make sure that the parent paths exist
  const parentPath = getParentPath(correctPath, correctName);
  if (
    parentPath !== '/' &&
    !bucket.folders.some((folder) => folder.path === parentPath)
  )
    return {
      canCreate: false,
      reason: dict.fileNavigator.errors.parentPathNotExist,
    };
  // If all checks pass, return true
  return {
    canCreate: true,
  };
};

/**
 * Transform bucket object to file items for the file navigator
 * @param bucket - Bucket object
 * @returns File items
 */
export const transformBucketToFileNavItem = (
  bucket: Bucket
): FileNavigatorItem[] => {
  const transformFile = (file: BucketFile): FileNavigatorItem => ({
    type: 'file',
    original: file,
    current: file,
  });
  const transformFolder = (folder: BucketFolder): FileNavigatorItem => ({
    type: 'folder',
    original: folder,
    current: folder,
    children: [
      // Get the folders that are direct children of the current folder
      ...bucket.folders
        .filter((a) => getParentPath(a.path, a.name) === folder.path)
        .map(transformFolder),
      // Get the files that are direct children of the current folder
      ...bucket.files
        .filter((a) => getParentPath(a.path) === folder.path)
        .map(transformFile),
    ],
  });
  return [
    // Get the folders in the root
    ...bucket.folders
      .filter((folder) => getParentPath(folder.path, folder.name) === '/')
      .map(transformFolder),
    // Get the files in the root
    ...bucket.files
      .filter((file) => getParentPath(file.path) === '/')
      .map(transformFile),
  ];
};

/**
 * Format the file or folder path
 * Make sure the path is alphanumeric and includes the name of the object being created
 * @param path The path of the file
 * @param desiredName The name of the file
 * @returns The correct path with the desired name
 */
export const getCorrectPath = (path: string, desiredName: string) => {
  // Replace all non-alphanumeric characters with underscores, except for dots and slashes
  let formattedPath = path.replace(/[^a-zA-Z0-9./]/g, '_').trim();
  // Make sure path starts with /
  formattedPath = formattedPath.startsWith('/')
    ? formattedPath
    : `/${formattedPath}`;
  // Remove the last / from the path, if it is the last character, but not the only character
  formattedPath =
    formattedPath.length > 1 && formattedPath.endsWith('/')
      ? formattedPath.slice(0, -1)
      : formattedPath;
  // Remove all dots from the path
  formattedPath = formattedPath.replace(/\./g, '');
  // Remove the final part of the part and replace with /desiredName
  formattedPath = formattedPath.replace(/\/[^/]*$/, `/${desiredName}`);
  return formattedPath;
};

/**
 * Get the parent path from a given path
 * @param path - Path to get the parent from
 * @returns Parent path, or '/' if the path is root
 *
 */
const getParentPath = (path: string, name?: string): string => {
  // Remove the first / from the path if it exists, and split the path into segments
  const pathSegments = path.replace(/^\//, '').split('/');
  // If the last element is the name or name is not provided, remove it
  if (!name || pathSegments[pathSegments.length - 1] === name)
    pathSegments.pop();
  return '/' + pathSegments.join('/');
};
