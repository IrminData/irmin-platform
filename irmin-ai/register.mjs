import { pathToFileURL } from 'url';
import { resolve } from 'path';

const baseURL = pathToFileURL(process.cwd()).href + '/';

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith('@/')) {
    const resolved = new URL(specifier.replace('@/', 'src/'), baseURL);
    return { url: resolved.href };
  }
  return defaultResolve(specifier, context);
}
