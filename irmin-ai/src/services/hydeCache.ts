import crypto from 'crypto';

interface HydeCacheEntry {
  hypotheticalContent: string;
  createdAt: number;
  queryHash: string;
  collectionName: string;
}

interface EmbeddingCacheEntry {
  embedding: number[];
  createdAt: number;
  textHash: string;
}

/**
 * Caches HyDE (Hypothetical Document Embedding) results to avoid repeated LLM calls.
 *
 * HyDE generation is expensive (1-3s per call) because it requires an LLM to generate
 * hypothetical content. Caching similar queries significantly reduces latency for
 * repeated or similar questions.
 */
class HydeCacheService {
  private hydeCache = new Map<string, HydeCacheEntry>();
  private embeddingCache = new Map<string, EmbeddingCacheEntry>();

  private readonly HYDE_TTL = 300_000; // 5 minutes for hypothetical content
  private readonly EMBEDDING_TTL = 3_600_000; // 1 hour for embeddings
  private readonly MAX_HYDE_ENTRIES = 100;
  private readonly MAX_EMBEDDING_ENTRIES = 500;

  /**
   * Get cached hypothetical content or generate new if not found/expired.
   *
   * @param query - The original user query
   * @param collectionName - The vector collection being searched
   * @param generateFn - Function to generate hypothetical content if cache miss
   * @param agentContext - Optional agent-specific context that affects the generated content
   * @returns The hypothetical content (cached or freshly generated)
   */
  async getCachedHydeOrGenerate(
    query: string,
    collectionName: string,
    generateFn: () => Promise<string | null>,
    agentContext?: Record<string, unknown>
  ): Promise<string | null> {
    const queryHash = this.hashQuery(query, collectionName, agentContext);
    const cached = this.hydeCache.get(queryHash);

    // Return cached content if still valid
    if (cached && Date.now() - cached.createdAt < this.HYDE_TTL) {
      return cached.hypotheticalContent;
    }

    // Generate new hypothetical content
    const hypotheticalContent = await generateFn();

    // Cache the result if valid
    if (hypotheticalContent) {
      this.hydeCache.set(queryHash, {
        hypotheticalContent,
        createdAt: Date.now(),
        queryHash,
        collectionName,
      });

      // Cleanup if cache is too large
      this.cleanupHydeCache();
    }

    return hypotheticalContent;
  }

  /**
   * Get cached embedding or generate new if not found/expired.
   *
   * @param text - The text to embed
   * @param embedFn - Function to generate embedding if cache miss
   * @returns The embedding vector (cached or freshly generated)
   */
  async getCachedEmbeddingOrGenerate(
    text: string,
    embedFn: () => Promise<number[]>
  ): Promise<number[]> {
    const textHash = this.hashText(text);
    const cached = this.embeddingCache.get(textHash);

    // Return cached embedding if still valid
    if (cached && Date.now() - cached.createdAt < this.EMBEDDING_TTL) {
      return cached.embedding;
    }

    // Generate new embedding
    const embedding = await embedFn();

    // Cache the result
    this.embeddingCache.set(textHash, {
      embedding,
      createdAt: Date.now(),
      textHash,
    });

    // Cleanup if cache is too large
    this.cleanupEmbeddingCache();

    return embedding;
  }

  /**
   * Check if a HyDE result exists in cache without generating.
   */
  hasHydeCache(
    query: string,
    collectionName: string,
    agentContext?: Record<string, unknown>
  ): boolean {
    const queryHash = this.hashQuery(query, collectionName, agentContext);
    const cached = this.hydeCache.get(queryHash);
    return !!cached && Date.now() - cached.createdAt < this.HYDE_TTL;
  }

  /**
   * Check if an embedding exists in cache without generating.
   */
  hasEmbeddingCache(text: string): boolean {
    const textHash = this.hashText(text);
    const cached = this.embeddingCache.get(textHash);
    return !!cached && Date.now() - cached.createdAt < this.EMBEDDING_TTL;
  }

  /**
   * Get cache statistics for monitoring.
   */
  getStats(): {
    hydeSize: number;
    embeddingSize: number;
    hydeOldestAge: number | null;
    embeddingOldestAge: number | null;
  } {
    let hydeOldestAge: number | null = null;
    let embeddingOldestAge: number | null = null;

    for (const entry of this.hydeCache.values()) {
      const age = Date.now() - entry.createdAt;
      if (hydeOldestAge === null || age > hydeOldestAge) {
        hydeOldestAge = age;
      }
    }

    for (const entry of this.embeddingCache.values()) {
      const age = Date.now() - entry.createdAt;
      if (embeddingOldestAge === null || age > embeddingOldestAge) {
        embeddingOldestAge = age;
      }
    }

    return {
      hydeSize: this.hydeCache.size,
      embeddingSize: this.embeddingCache.size,
      hydeOldestAge,
      embeddingOldestAge,
    };
  }

  /**
   * Clear all caches.
   */
  clearAll(): void {
    this.hydeCache.clear();
    this.embeddingCache.clear();
  }

  /**
   * Clear only HyDE cache.
   */
  clearHydeCache(): void {
    this.hydeCache.clear();
  }

  /**
   * Clear only embedding cache.
   */
  clearEmbeddingCache(): void {
    this.embeddingCache.clear();
  }

  private hashQuery(
    query: string,
    collection: string,
    agentContext?: Record<string, unknown>
  ): string {
    // Normalize query: lowercase, trim, limit length
    const normalized = query.toLowerCase().trim().slice(0, 200);

    // Include agent context in hash if provided (affects LLM prompt)
    let contextHash = '';
    if (agentContext && Object.keys(agentContext).length > 0) {
      // Sort keys for consistent hashing
      const sortedContext = Object.keys(agentContext)
        .sort()
        .map((key) => `${key}:${agentContext[key]}`)
        .join('|');
      contextHash = `:${sortedContext.slice(0, 100)}`;
    }

    return crypto
      .createHash('sha256')
      .update(`hyde:${collection}:${normalized}${contextHash}`)
      .digest('hex')
      .slice(0, 16);
  }

  private hashText(text: string): string {
    // For embeddings, use full text hash (truncated for efficiency)
    const normalized = text.trim().slice(0, 1000);
    return crypto
      .createHash('sha256')
      .update(`embed:${normalized}`)
      .digest('hex')
      .slice(0, 20);
  }

  private cleanupHydeCache(): void {
    if (this.hydeCache.size <= this.MAX_HYDE_ENTRIES) return;

    // Remove oldest entries until we're under the limit
    const entries = Array.from(this.hydeCache.entries()).sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    );

    const toRemove = entries.slice(
      0,
      this.hydeCache.size - this.MAX_HYDE_ENTRIES
    );
    for (const [key] of toRemove) {
      this.hydeCache.delete(key);
    }
  }

  private cleanupEmbeddingCache(): void {
    if (this.embeddingCache.size <= this.MAX_EMBEDDING_ENTRIES) return;

    // Remove oldest entries until we're under the limit
    const entries = Array.from(this.embeddingCache.entries()).sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    );

    const toRemove = entries.slice(
      0,
      this.embeddingCache.size - this.MAX_EMBEDDING_ENTRIES
    );
    for (const [key] of toRemove) {
      this.embeddingCache.delete(key);
    }
  }
}

export const hydeCacheService = new HydeCacheService();
