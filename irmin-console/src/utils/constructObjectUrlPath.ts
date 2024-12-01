/**
 * Construct the path to an object in the repository
 *
 * @param path - The path to the object in the repository
 * @param name - The name of the object (example: file.txt)
 * @returns The full path to the object in the repository (example: /example/path/file.txt)
 */
export function constructObjectUrlPath(path: string, name: string): string {
  let normalizedPath = path.replace(/^\/|\/$/g, ''); // Remove leading and trailing slashes

  // Remove the name from the path if it exists
  if (normalizedPath.endsWith(`/${name}`)) {
    normalizedPath = normalizedPath.slice(0, -name.length - 1);
  }

  return normalizedPath ? `${normalizedPath}/${name}` : name; // Handle root path case
}
