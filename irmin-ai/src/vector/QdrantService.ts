import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

import { env } from '@/config/env';

interface QdrantPoint {
  id?: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface SearchResult {
  id: string | number;
  version?: number;
  score: number;
  payload?: Record<string, unknown>;
  vector?: number[] | Record<string, number[]> | null;
}

class QdrantService {
  private client: QdrantClient;

  constructor() {
    this.client = this.createClient();
  }

  /**
   * Create a QdrantClient with proper URL and port handling
   */
  private createClient(): QdrantClient {
    // Parse URL to extract host and port separately
    const urlObj = new URL(env.QDRANT_URL);

    // Determine port: env config > explicit in URL > default based on protocol
    const port = env.QDRANT_PORT
      ? env.QDRANT_PORT
      : urlObj.port
        ? parseInt(urlObj.port, 10)
        : urlObj.protocol === 'https:'
          ? 443
          : 6333;

    console.log(
      `Initializing Qdrant client: ${urlObj.protocol}//${urlObj.hostname}:${port}`
    );

    return new QdrantClient({
      url: `${urlObj.protocol}//${urlObj.hostname}`,
      port: port,
      apiKey: env.QDRANT_API_KEY,
    });
  }

  /**
   * Get the underlying Qdrant client
   */
  getClient(): QdrantClient {
    return this.client;
  }

  /**
   * Check if a collection exists
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    try {
      const response = await this.client.collectionExists(collectionName);
      return response.exists;
    } catch (error) {
      console.warn(
        `Failed to check if collection exists: ${collectionName}`,
        error
      );
      return false;
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(
    collectionName: string,
    vectorSize: number = 1536,
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
  ): Promise<boolean> {
    try {
      const exists = await this.collectionExists(collectionName);
      if (exists) {
        return true;
      }

      await this.client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: distance,
        },
      });
      return true;
    } catch (error) {
      throw new Error(
        `Failed to create collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ensure a collection exists, creating it if necessary
   */
  async ensureCollection(
    collectionName: string,
    vectorSize: number = 1536,
    suppressConnectionErrors: boolean = false
  ): Promise<boolean> {
    try {
      return await this.createCollection(collectionName, vectorSize);
    } catch (error) {
      if (suppressConnectionErrors) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // If it's a connection error, skip (don't try to create)
        if (
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('timeout')
        ) {
          console.warn(
            `Cannot ensure collection '${collectionName}' - Qdrant connection issue: ${errorMessage}`
          );
          return false;
        }
      }
      throw error;
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionName: string): Promise<boolean> {
    try {
      await this.client.deleteCollection(collectionName);
      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Upsert points (documents) into a collection
   */
  async upsertPoints(
    collectionName: string,
    points: QdrantPoint[]
  ): Promise<void> {
    try {
      // Ensure points have IDs
      const pointsWithIds = points.map((point) => ({
        id: point.id || uuidv4(),
        vector: point.vector,
        payload: point.payload,
      }));

      await this.client.upsert(collectionName, {
        wait: true,
        points: pointsWithIds,
      });
    } catch (error) {
      throw new Error(
        `Failed to upsert points into ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for similar vectors
   */
  async search(
    collectionName: string,
    vector: number[],
    limit: number = 5,
    filter?: Record<string, unknown>,
    scoreThreshold?: number
  ): Promise<SearchResult[]> {
    try {
      const result = await this.client.search(collectionName, {
        vector,
        limit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: filter as any, // Cast to any because Qdrant filter types are complex
        score_threshold: scoreThreshold,
        with_payload: true,
      });

      return result.map((item) => ({
        id: item.id,
        version: item.version,
        score: item.score,
        payload: item.payload as Record<string, unknown> | undefined,
        vector: item.vector as number[] | undefined,
      }));
    } catch (error) {
      throw new Error(
        `Failed to search in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Scroll through points (useful for listing/filtering)
   */
  async scroll(
    collectionName: string,
    filter?: Record<string, unknown>,
    limit: number = 100,
    offset?: string | number // Qdrant uses point ID as offset
  ): Promise<{ points: SearchResult[]; nextOffset?: string | number | null }> {
    try {
      const result = await this.client.scroll(collectionName, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: filter as any,
        limit,
        with_payload: true,
        with_vector: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        offset: offset as any,
      });

      return {
        points: result.points.map((item) => {
          const point = item as unknown as Record<string, unknown>;
          return {
            id: point.id as string | number,
            version: (point.version as number) || 0,
            score: (point.score as number) || 0,
            payload: (point.payload as Record<string, unknown>) || undefined,
            vector: (point.vector as number[]) || undefined,
          };
        }),
        nextOffset: result.next_page_offset as
          | string
          | number
          | null
          | undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to scroll ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete points by filter
   */
  async deletePoints(
    collectionName: string,
    filter: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.client.delete(collectionName, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: filter as any,
      });
    } catch (error) {
      throw new Error(
        `Failed to delete points from ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const qdrantService = new QdrantService();
