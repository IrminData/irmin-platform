import type IrminCore from '@/lib/core';

import type {
  EmbeddingConfig,
  EmbeddingFile,
  EmbeddingSearchResponse,
  UpdateEmbeddingMetadataRequest,
  UpdateEmbeddingPriorityRequest,
  UpsertEmbeddingItem,
  UpsertEmbeddingsRequest,
  UpsertEmbeddingsResponse,
} from '@/types/core/Embedding';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Request body for searching embeddings.
 */
interface SearchEmbeddingsRequest {
  /** Query text to search for */
  query: string;
  /** Path to the embedding file */
  embedding_path: string;
  /** Repository reference (branch/tag/commit) */
  ref?: string;
  /** Number of results to return (default: 10) */
  top_k?: number;
  /** Optional metadata filters */
  filter?: Record<string, string>;
}

/**
 * Embeddings API service
 *
 * Responsible for all embeddings-related API calls.
 */
class EmbeddingsService {
  private irminCore: IrminCore;

  /**
   * Create a new EmbeddingsService.
   *
   * @param irminCore - The IrminCore instance for API calls.
   */
  constructor(irminCore: IrminCore) {
    this.irminCore = irminCore;
    // Bind methods
    this.searchEmbeddings = this.searchEmbeddings.bind(this);
    this.listEmbeddings = this.listEmbeddings.bind(this);
    this.getEmbeddingInfo = this.getEmbeddingInfo.bind(this);
    this.upsertEmbeddings = this.upsertEmbeddings.bind(this);
    this.updateEmbeddingMetadata = this.updateEmbeddingMetadata.bind(this);
    this.updateEmbeddingPriority = this.updateEmbeddingPriority.bind(this);
  }

  /**
   * Perform vector similarity search on an embedding file.
   *
   * @param props - The search properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.query - Query text to search for.
   * @param props.embeddingPath - Path to the embedding file.
   * @param props.ref - (optional) Repository reference (branch/tag/commit).
   * @param props.topK - (optional) Number of results to return.
   * @param props.filter - (optional) Metadata filters.
   * @returns IrminAPIResponse containing the search results.
   */
  async searchEmbeddings({
    workspace,
    repository,
    query,
    embeddingPath,
    ref,
    topK,
    filter,
  }: {
    workspace: string;
    repository: string;
    query: string;
    embeddingPath: string;
    ref?: string;
    topK?: number;
    filter?: Record<string, string>;
  }): Promise<IrminAPIResponse<EmbeddingSearchResponse>> {
    try {
      const requestBody: SearchEmbeddingsRequest = {
        query,
        embedding_path: embeddingPath,
        ref,
        top_k: topK,
        filter,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/embeddings/search`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<EmbeddingSearchResponse>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Search embeddings error');
      throw error;
    }
  }

  /**
   * List embedding files in a repository path.
   *
   * @param props - The list properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.prefix - (optional) Prefix to filter embedding files.
   * @param props.ref - (optional) Repository reference (branch/tag/commit).
   * @returns IrminAPIResponse containing the list of embedding files.
   */
  async listEmbeddings({
    workspace,
    repository,
    prefix,
    ref,
  }: {
    workspace: string;
    repository: string;
    prefix?: string;
    ref?: string;
  }): Promise<IrminAPIResponse<EmbeddingFile[]>> {
    try {
      const urlParams = new URLSearchParams();
      if (prefix) urlParams.append('prefix', prefix);
      if (ref) urlParams.append('ref', ref);

      let url = `/v1/workspaces/${workspace}/repositories/${repository}/embeddings`;
      if (urlParams.toString()) {
        url += `?${urlParams.toString()}`;
      }

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<EmbeddingFile[]>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'List embeddings error');
      throw error;
    }
  }

  /**
   * Get metadata about an embedding file.
   *
   * @param props - The info properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.embeddingPath - Path to the embedding file.
   * @param props.ref - (optional) Repository reference (branch/tag/commit).
   * @returns IrminAPIResponse containing the embedding file info.
   */
  async getEmbeddingInfo({
    workspace,
    repository,
    embeddingPath,
    ref,
  }: {
    workspace: string;
    repository: string;
    embeddingPath: string;
    ref?: string;
  }): Promise<IrminAPIResponse<EmbeddingFile>> {
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('embedding_path', embeddingPath);
      if (ref) urlParams.append('ref', ref);

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/embeddings/info?${urlParams.toString()}`;

      const response = (await this.irminCore.fetchAPI(url, {
        method: 'GET',
      })) as IrminAPIResponse<EmbeddingFile>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Get embedding info error');
      throw error;
    }
  }

  /**
   * Upsert embeddings with deduplication by content hash.
   *
   * @param props - The upsert properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.outputPath - Output path for the embedding file.
   * @param props.sourcePaths - (optional) List of source file paths to vectorize.
   * @param props.embeddings - (optional) Pre-defined embedding items.
   * @param props.ref - (optional) Repository reference.
   * @param props.config - (optional) Embedding configuration.
   * @param props.metadata - (optional) Metadata to apply to all embeddings.
   * @param props.priority - (optional) Default priority for all embeddings.
   * @returns IrminAPIResponse containing upsert statistics.
   */
  async upsertEmbeddings({
    workspace,
    repository,
    outputPath,
    sourcePaths,
    embeddings,
    ref,
    config,
    metadata,
    priority,
  }: {
    workspace: string;
    repository: string;
    outputPath: string;
    sourcePaths?: string[];
    embeddings?: UpsertEmbeddingItem[];
    ref?: string;
    config?: EmbeddingConfig;
    metadata?: Record<string, string>;
    priority?: number;
  }): Promise<IrminAPIResponse<UpsertEmbeddingsResponse>> {
    try {
      const requestBody: UpsertEmbeddingsRequest = {
        output_path: outputPath,
        source_paths: sourcePaths,
        embeddings,
        ref,
        config,
        metadata,
        priority,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/embeddings/upsert`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<UpsertEmbeddingsResponse>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Upsert embeddings error');
      throw error;
    }
  }

  /**
   * Update metadata for specific embeddings.
   *
   * @param props - The update properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.embeddingPath - Path to the embedding file.
   * @param props.updates - Map of embedding ID to new metadata.
   * @param props.ref - (optional) Repository reference.
   * @returns IrminAPIResponse indicating success.
   */
  async updateEmbeddingMetadata({
    workspace,
    repository,
    embeddingPath,
    updates,
    ref,
  }: {
    workspace: string;
    repository: string;
    embeddingPath: string;
    updates: Record<string, Record<string, string>>;
    ref?: string;
  }): Promise<IrminAPIResponse<void>> {
    try {
      const requestBody: UpdateEmbeddingMetadataRequest = {
        embedding_path: embeddingPath,
        ref,
        updates,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/embeddings/metadata`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<void>;

      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Update embedding metadata error'
      );
      throw error;
    }
  }

  /**
   * Update priority for specific embeddings.
   *
   * @param props - The update properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.embeddingPath - Path to the embedding file.
   * @param props.updates - Map of embedding ID to new priority.
   * @param props.ref - (optional) Repository reference.
   * @returns IrminAPIResponse indicating success.
   */
  async updateEmbeddingPriority({
    workspace,
    repository,
    embeddingPath,
    updates,
    ref,
  }: {
    workspace: string;
    repository: string;
    embeddingPath: string;
    updates: Record<string, number>;
    ref?: string;
  }): Promise<IrminAPIResponse<void>> {
    try {
      const requestBody: UpdateEmbeddingPriorityRequest = {
        embedding_path: embeddingPath,
        ref,
        updates,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/embeddings/priority`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<void>;

      return response;
    } catch (error) {
      console.error(
        (error as Error).message,
        'Update embedding priority error'
      );
      throw error;
    }
  }
}

export default EmbeddingsService;
