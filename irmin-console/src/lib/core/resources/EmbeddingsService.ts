import type IrminCore from '@/lib/core';

import type {
  EmbeddingConfig,
  EmbeddingFile,
  EmbeddingSearchResponse,
} from '@/types/core/Embedding';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Request body for vectorizing repository objects.
 */
interface VectorizeObjectsRequest {
  /** List of source file paths to vectorize */
  source_paths: string[];
  /** Output path for the embedding file */
  output_path: string;
  /** Repository reference (branch/tag/commit) */
  ref?: string;
  /** Optional embedding configuration */
  config?: EmbeddingConfig;
}

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
    this.vectorizeObjects = this.vectorizeObjects.bind(this);
    this.searchEmbeddings = this.searchEmbeddings.bind(this);
    this.listEmbeddings = this.listEmbeddings.bind(this);
    this.getEmbeddingInfo = this.getEmbeddingInfo.bind(this);
  }

  /**
   * Create embeddings from one or more repository objects.
   *
   * @param props - The vectorization properties.
   * @param props.workspace - The workspace slug.
   * @param props.repository - The repository slug.
   * @param props.sourcePaths - List of source file paths to vectorize.
   * @param props.outputPath - Output path for the embedding file.
   * @param props.ref - (optional) Repository reference (branch/tag/commit).
   * @param props.config - (optional) Embedding configuration.
   * @returns IrminAPIResponse containing the created embedding file.
   */
  async vectorizeObjects({
    workspace,
    repository,
    sourcePaths,
    outputPath,
    ref,
    config,
  }: {
    workspace: string;
    repository: string;
    sourcePaths: string[];
    outputPath: string;
    ref?: string;
    config?: EmbeddingConfig;
  }): Promise<IrminAPIResponse<EmbeddingFile>> {
    try {
      const requestBody: VectorizeObjectsRequest = {
        source_paths: sourcePaths,
        output_path: outputPath,
        ref,
        config,
      };

      const url = `/v1/workspaces/${workspace}/repositories/${repository}/embeddings/vectorize`;
      const response = (await this.irminCore.fetchAPI(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })) as IrminAPIResponse<EmbeddingFile>;

      return response;
    } catch (error) {
      console.error((error as Error).message, 'Vectorize objects error');
      throw error;
    }
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
}

export default EmbeddingsService;
