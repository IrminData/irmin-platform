import fs from 'fs/promises';
import path from 'path';

/**
 * Available documentation files for static injection
 */
export type DocFile =
  | 'concepts'
  | 'connections'
  | 'object-schema'
  | 'scripting'
  | 'sql'
  | 'workflows';

/**
 * Predefined doc sets for different use cases
 */
export const DOC_SETS = {
  /** Core Irmin concepts - good baseline for any agent */
  core: ['concepts'] as DocFile[],

  /** Essential docs for the assistant agent */
  assistant: ['concepts', 'connections', 'workflows'] as DocFile[],

  /** Docs needed for SQL/query operations */
  query: ['concepts', 'sql', 'object-schema'] as DocFile[],

  /** Docs for workflow-related queries */
  workflow: ['concepts', 'workflows', 'connections'] as DocFile[],

  /** Docs for scripting/JavaScript queries */
  scripting: ['concepts', 'scripting', 'object-schema'] as DocFile[],

  /** All docs - use sparingly due to token cost */
  all: [
    'concepts',
    'connections',
    'object-schema',
    'scripting',
    'sql',
    'workflows',
  ] as DocFile[],
} as const;

/**
 * Cache for loaded docs to avoid repeated file reads
 */
const docsCache = new Map<DocFile, string>();

/**
 * Load a single doc file from the llm-docs folder
 */
async function loadDocFile(docName: DocFile): Promise<string> {
  // Check cache first
  const cached = docsCache.get(docName);
  if (cached) {
    return cached;
  }

  const docPath = path.join(process.cwd(), 'llm-docs', `${docName}.md`);

  try {
    const content = await fs.readFile(docPath, 'utf-8');
    // Cache the content
    docsCache.set(docName, content);
    return content;
  } catch (error) {
    console.warn(`Failed to load doc file ${docName}:`, error);
    return '';
  }
}

/**
 * Load multiple doc files and combine them
 */
export async function loadDocs(docFiles: DocFile[]): Promise<string> {
  const loadStart = Date.now();

  // Load all docs in parallel
  const contents = await Promise.all(docFiles.map((doc) => loadDocFile(doc)));

  // Filter out empty contents and join with separators
  const combinedDocs = contents
    .filter((content) => content.trim())
    .map((content, index) => {
      const docName = docFiles[index];
      return `## ${docName.charAt(0).toUpperCase() + docName.slice(1).replace(/-/g, ' ')}\n\n${content}`;
    })
    .join('\n\n---\n\n');

  console.log(
    `[Agent Timing] loadDocs (${docFiles.join(', ')}): ${Date.now() - loadStart}ms`
  );

  return combinedDocs;
}

/**
 * Load a predefined doc set
 */
export async function loadDocSet(
  setName: keyof typeof DOC_SETS
): Promise<string> {
  return loadDocs(DOC_SETS[setName]);
}

/**
 * Preload all docs into cache (call at startup for faster first requests)
 */
export async function preloadAllDocs(): Promise<void> {
  const allDocs: DocFile[] = [
    'concepts',
    'connections',
    'object-schema',
    'scripting',
    'sql',
    'workflows',
  ];
  await Promise.all(allDocs.map((doc) => loadDocFile(doc)));
  console.log('[StaticDocs] All docs preloaded into cache');
}
