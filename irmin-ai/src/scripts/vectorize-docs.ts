import { indexingService } from '@/vector';
import { collectionService } from '@/vector/vectorCollections';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';

import { analyticsService } from '@/services/analytics';

// Configuration for document URLs and local file paths to vectorize
const DOCUMENT_URLS = [
  // Go-lang SDK docs
  'https://raw.githubusercontent.com/IrminData/irmin-sdk-go/refs/heads/development/README.md',
  'https://raw.githubusercontent.com/IrminData/irmin-sdk-go/refs/heads/development/docs/docs.md',
];

// Configuration for local LLM documentation files
const LOCAL_DOCUMENT_PATHS = [
  // LLM documentation files
  'llm-docs/concepts.md',
  'llm-docs/workflows.md',
  'llm-docs/connections.md',
  'llm-docs/object-schema.md',
  'llm-docs/scripting.md',
  'llm-docs/sql.md',
];

interface ScriptResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
  executionTime: number;
  timestamp: string;
}

interface DocumentChunk {
  content: string;
  metadata: {
    url?: string; // For remote URLs
    filePath?: string; // For local files
    title: string;
    section?: string;
    timestamp: string;
    chunkIndex: number;
    totalChunks: number;
    documentId: string; // Unique ID for consistent replacement
    source: 'url' | 'local'; // Track source type
  };
}

/**
 * VectorizeDocsScript - Fetches and indexes documentation from URLs and local files
 */
export class VectorizeDocsScript {
  private config: {
    collectionName: string;
    chunkSize: number;
    chunkOverlap: number;
    maxConcurrent: number;
    urls: string[]; // URLs to vectorize
    localPaths: string[]; // Local file paths to vectorize
    replaceMode: boolean; // Whether to replace existing documents or append
  };

  private collectionService: typeof collectionService;

  constructor(config: typeof VectorizeDocsScript.prototype.config) {
    this.config = {
      ...config,
      replaceMode: config.replaceMode ?? true, // Default to replace mode
      localPaths: config.localPaths ?? [], // Default to empty array
    };
    this.collectionService = collectionService;
  }

  /**
   * Execute the vectorization script
   */
  async execute(): Promise<ScriptResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Use provided URLs or default to hardcoded list
      const urls = this.config.urls?.length ? this.config.urls : DOCUMENT_URLS;
      // Use provided local paths or default to hardcoded list
      const localPaths = this.config.localPaths?.length
        ? this.config.localPaths
        : LOCAL_DOCUMENT_PATHS;

      // Fetch and parse documents from URLs and local files
      const documents = await this.fetchDocuments(urls, localPaths);

      // Chunk documents
      const chunks = this.chunkDocuments(documents);

      // Ensure collection exists or create it
      await this.ensureCollection();

      let existingChunkIds: string[] = [];
      let actualDeletedCount = 0;

      if (this.config.replaceMode) {
        // Phase 1: Get existing chunk IDs before adding new ones
        existingChunkIds = await this.getExistingChunkIds();
      }

      // Phase 2: Index new documents in vector store
      await this.indexDocuments(chunks);

      // Phase 3: Remove old documents (only after new ones are successfully indexed)
      if (this.config.replaceMode && existingChunkIds.length > 0) {
        const deletionResult = await this.removeOldDocuments(existingChunkIds);
        actualDeletedCount = deletionResult.deletedCount;
      }

      const executionTime = Date.now() - startTime;

      // Log analytics
      await analyticsService.logVectorIndexing('documents_indexed', {
        collectionName: this.config.collectionName,
        documentCount: documents.length,
      });

      return {
        success: true,
        message: `Successfully vectorized ${documents.length} documents into ${chunks.length} chunks${
          this.config.replaceMode
            ? ` and removed ${actualDeletedCount} of ${existingChunkIds.length} old chunks`
            : ''
        }`,
        data: {
          documentsProcessed: documents.length,
          chunksCreated: chunks.length,
          urlsProcessed: urls.length,
          localFilesProcessed: localPaths.length,
          replaceMode: this.config.replaceMode,
          oldChunksRemoved: actualDeletedCount,
          oldChunksAttempted: existingChunkIds.length,
        },
        executionTime,
        timestamp,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await analyticsService.logVectorError(
        'script_vectorize_docs',
        errorMessage,
        {
          collectionName: this.config.collectionName,
          executionTime,
          replaceMode: this.config.replaceMode,
        }
      );

      return {
        success: false,
        message: 'Failed to vectorize documents',
        error: errorMessage,
        executionTime,
        timestamp,
      };
    }
  }

  /**
   * Fetch and parse documents from URLs and local files
   */
  private async fetchDocuments(
    urls: string[],
    localPaths: string[]
  ): Promise<DocumentChunk[]> {
    const documents: DocumentChunk[] = [];
    const errors: string[] = [];

    // Process URLs in batches to avoid overwhelming servers
    const urlBatches = this.chunkArray(urls, this.config.maxConcurrent);

    for (const batch of urlBatches) {
      const promises = batch.map((url) => this.fetchSingleDocument(url));
      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          documents.push(result.value);
        } else {
          errors.push(`Failed to fetch ${batch[index]}: ${result.reason}`);
        }
      });
    }

    // Process local files
    const localFileBatches = this.chunkArray(
      localPaths,
      this.config.maxConcurrent
    );

    for (const batch of localFileBatches) {
      const promises = batch.map((filePath) => this.fetchLocalFile(filePath));
      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          documents.push(result.value);
        } else {
          errors.push(`Failed to fetch ${batch[index]}: ${result.reason}`);
        }
      });
    }

    if (errors.length > 0) {
      console.warn('Some documents failed to fetch:', errors);
    }

    return documents;
  }

  /**
   * Fetch and parse a single document
   */
  private async fetchSingleDocument(url: string): Promise<DocumentChunk> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Irmin-AI-Docs-Bot/1.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script and style elements
      $('script, style, nav, header, footer').remove();

      // Extract title
      const title =
        $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

      // Extract main content
      const mainContent = $(
        'main, article, .content, .post, .page-content'
      ).first();
      const content = mainContent.length
        ? mainContent.text().trim()
        : $('body').text().trim();

      // Clean up whitespace
      const cleanedContent = content.replace(/\s+/g, ' ').trim();

      if (!cleanedContent) {
        throw new Error('No content found in document');
      }

      return {
        content: cleanedContent,
        metadata: {
          url,
          title,
          timestamp: new Date().toISOString(),
          chunkIndex: 0,
          totalChunks: 1,
          documentId: this.generateDocumentId(url, title),
          source: 'url',
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch document from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch and parse a local file
   */
  private async fetchLocalFile(filePath: string): Promise<DocumentChunk> {
    try {
      // Resolve the file path relative to the project root
      const resolvedPath = path.resolve(process.cwd(), filePath);

      // Check if file exists
      try {
        await fs.access(resolvedPath);
      } catch {
        throw new Error(`File not found: ${resolvedPath}`);
      }

      // Read file content
      const content = await fs.readFile(resolvedPath, 'utf-8');

      if (!content.trim()) {
        throw new Error('File is empty');
      }

      // Extract title from filename or first heading
      const fileName = path.basename(filePath, path.extname(filePath));
      let title = fileName;

      // Try to extract title from markdown content
      const firstHeadingMatch = content.match(/^#\s+(.+)$/m);
      if (firstHeadingMatch) {
        title = firstHeadingMatch[1].trim();
      }

      // Clean up content (remove markdown syntax for better vectorization)
      const cleanedContent = this.cleanMarkdownContent(content);

      return {
        content: cleanedContent,
        metadata: {
          filePath,
          title,
          timestamp: new Date().toISOString(),
          chunkIndex: 0,
          totalChunks: 1,
          documentId: this.generateDocumentId(filePath, title),
          source: 'local',
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch local file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clean markdown content for better vectorization
   */
  private cleanMarkdownContent(content: string): string {
    return (
      content
        // Remove markdown headers but keep the text
        .replace(/^#{1,6}\s+/gm, '')
        // Remove markdown links but keep the text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove markdown bold/italic formatting
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Remove code blocks but keep inline code
        .replace(/```[\s\S]*?```/g, '')
        // Remove horizontal rules
        .replace(/^---+$/gm, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Chunk documents into smaller pieces for better vectorization
   */
  private chunkDocuments(documents: DocumentChunk[]): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    documents.forEach((doc) => {
      const textChunks = this.chunkText(
        doc.content,
        this.config.chunkSize,
        this.config.chunkOverlap
      );

      textChunks.forEach((chunkText, index) => {
        chunks.push({
          content: chunkText,
          metadata: {
            ...doc.metadata,
            chunkIndex: index,
            totalChunks: textChunks.length,
            documentId: `${doc.metadata.documentId}-chunk-${index}`,
          },
        });
      });
    });

    return chunks;
  }

  /**
   * Split text into chunks with overlap
   */
  private chunkText(
    text: string,
    chunkSize: number,
    overlap: number
  ): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);

        if (breakPoint > start + chunkSize * 0.5) {
          end = breakPoint + 1;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - overlap;

      if (start >= text.length) break;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Ensure the collection exists or create it
   */
  private async ensureCollection(): Promise<string> {
    try {
      // Try to get existing collection
      const existingCollection =
        await this.collectionService.getCollectionByName(
          this.config.collectionName
        );

      if (existingCollection) {
        return existingCollection.id;
      }

      // Create new collection
      const collection = await this.collectionService.createCollection({
        name: this.config.collectionName,
        description: `Auto-generated collection for ${this.config.collectionName} documentation`,
        embeddingModel: 'text-embedding-3-small',
        embeddingDimensions: 1536,
        isSystemCollection: true,
      });

      return collection.id;
    } catch (error) {
      throw new Error(
        `Failed to ensure collection exists: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Index documents in the vector store
   */
  private async indexDocuments(chunks: DocumentChunk[]): Promise<void> {
    try {
      // Get collection config
      const collectionConfig = await this.collectionService.getCollectionByName(
        this.config.collectionName
      );
      if (!collectionConfig) {
        throw new Error('Collection not found');
      }

      // Create vector store connection
      const vectorStore = await indexingService.initVectorStore(
        collectionConfig.name,
        true
      );

      // Convert chunks to vector documents
      const vectorDocuments = chunks.map((chunk) => ({
        pageContent: chunk.content,
        metadata: chunk.metadata,
      }));

      // Index documents
      await indexingService.indexDocuments(
        vectorStore,
        vectorDocuments,
        collectionConfig.name
      );
    } catch (error) {
      throw new Error(
        `Failed to index documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Helper to chunk array into smaller batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Generate a unique document ID based on URL, title, and timestamp
   */
  private generateDocumentId(url: string, title: string): string {
    // Create a hash-like ID from URL and title for consistency
    const baseString = `${url}-${title}`;
    // Simple hash function for consistent IDs
    let hash = 0;
    for (let i = 0; i < baseString.length; i++) {
      const char = baseString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Add timestamp to make each execution unique
    const timestamp = Date.now().toString(36);
    return `doc-${Math.abs(hash).toString(36)}-${timestamp}`;
  }

  /**
   * Get existing chunk IDs from the vector store using pagination
   */
  private async getExistingChunkIds(): Promise<string[]> {
    try {
      const collectionConfig = await this.collectionService.getCollectionByName(
        this.config.collectionName
      );
      if (!collectionConfig) {
        return [];
      }

      const vectorStore = await indexingService.initVectorStore(
        collectionConfig.name,
        true
      );

      const chunkIds: string[] = [];
      const batchSize = 1000; // Process in smaller batches for better memory management
      let offset: string | undefined = undefined;
      let totalPointsProcessed = 0;

      console.log(
        `Starting to retrieve existing chunks from collection ${collectionConfig.name}`
      );

      // Use Qdrant's scroll API with pagination to retrieve all points
      while (true) {
        const scrollParams: {
          limit: number;
          with_payload: boolean;
          with_vector: boolean;
          offset?: string;
        } = {
          limit: batchSize,
          with_payload: true,
          with_vector: false,
        };

        // Add offset for pagination (except for first request)
        if (offset) {
          scrollParams.offset = offset;
        }

        const batchResult = await vectorStore.client.scroll(
          collectionConfig.name,
          scrollParams
        );

        const points = batchResult.points || [];

        if (points.length === 0) {
          // No more points to process
          break;
        }

        // Process points in this batch
        for (const point of points) {
          if (
            point.payload &&
            typeof point.payload === 'object' &&
            'metadata' in point.payload &&
            point.payload.metadata &&
            typeof point.payload.metadata === 'object' &&
            'documentId' in point.payload.metadata
          ) {
            const chunkDocId = point.payload.metadata.documentId as string;
            if (chunkDocId && !chunkIds.includes(chunkDocId)) {
              chunkIds.push(chunkDocId);
            }
          }
        }

        totalPointsProcessed += points.length;

        // Update offset for next iteration
        if (points.length < batchSize) {
          // Last batch (partial or complete)
          break;
        }

        // Use the last point's ID as offset for next request
        const lastPoint = points[points.length - 1];
        offset = lastPoint.id?.toString();
      }

      console.log(
        `Retrieved ${totalPointsProcessed} points from collection ${collectionConfig.name}, found ${chunkIds.length} unique document chunks`
      );

      return chunkIds;
    } catch (error) {
      console.warn('Failed to get existing document IDs:', error);
      return [];
    }
  }

  /**
   * Remove old documents from the vector store
   */
  private async removeOldDocuments(
    documentIds: string[]
  ): Promise<{ deletedCount: number; errors: string[] }> {
    try {
      const collectionConfig = await this.collectionService.getCollectionByName(
        this.config.collectionName
      );
      if (!collectionConfig) {
        throw new Error('Collection not found');
      }

      const vectorStore = await indexingService.initVectorStore(
        collectionConfig.name,
        true
      );

      // Remove specific existing chunks that were present before indexing new ones
      const deletionResult = await indexingService.deleteSpecificChunks(
        vectorStore,
        documentIds,
        collectionConfig.name
      );

      if (deletionResult.errors.length > 0) {
        console.warn('Some documents failed to delete:', deletionResult.errors);
      }

      console.log(
        `Successfully removed ${deletionResult.deletedCount} old documents from collection`
      );

      return {
        deletedCount: deletionResult.deletedCount,
        errors: deletionResult.errors,
      };
    } catch (error) {
      throw new Error(
        `Failed to remove old documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Factory function to execute the vectorize docs script with default configuration
 */
export async function vectorizeDocsScript(): Promise<ScriptResult> {
  const defaultConfig = {
    collectionName: 'irmin-docs',
    chunkSize: 700,
    chunkOverlap: 200,
    maxConcurrent: 3,
    urls: DOCUMENT_URLS,
    localPaths: LOCAL_DOCUMENT_PATHS,
    replaceMode: true, // Default to replace mode for documentation
  };

  const script = new VectorizeDocsScript(defaultConfig);
  return await script.execute();
}
