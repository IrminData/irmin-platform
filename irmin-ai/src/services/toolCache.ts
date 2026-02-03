import crypto from 'crypto';
import { DynamicStructuredTool } from 'langchain';

import { toolsService } from '@/services/tools';

interface CachedToolsEntry {
  tools: DynamicStructuredTool[];
  fetchedAt: number;
  tokenHash: string;
}

/**
 * Caches MCP tools per auth token to avoid repeated HTTP calls.
 * Tools rarely change during a session, so a 1-minute TTL is sufficient.
 */
class ToolCacheService {
  private cache = new Map<string, CachedToolsEntry>();
  private readonly CACHE_TTL = 60_000; // 1 minute
  private readonly MAX_ENTRIES = 100; // Limit cache size to prevent unbounded growth

  /**
   * Get tools from cache or fetch fresh if expired/missing.
   * @param authToken - The bearer token for MCP authentication
   * @returns Array of dynamic structured tools
   */
  async getTools(authToken: string): Promise<DynamicStructuredTool[]> {
    const tokenHash = this.hashToken(authToken);
    const cached = this.cache.get(tokenHash);

    // Return cached tools if still valid
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL) {
      return cached.tools;
    }

    // Fetch fresh tools from MCP
    const tools = await this.fetchTools(authToken);

    // Cache the result
    this.cache.set(tokenHash, {
      tools,
      fetchedAt: Date.now(),
      tokenHash,
    });

    // Cleanup old entries periodically
    this.cleanupExpiredEntries();

    return tools;
  }

  /**
   * Force refresh tools for a specific token, bypassing cache.
   */
  async refreshTools(authToken: string): Promise<DynamicStructuredTool[]> {
    const tokenHash = this.hashToken(authToken);
    this.cache.delete(tokenHash);
    return this.getTools(authToken);
  }

  /**
   * Clear all cached tools.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring.
   */
  getStats(): { size: number; oldestEntryAge: number | null } {
    let oldestAge: number | null = null;

    for (const entry of this.cache.values()) {
      const age = Date.now() - entry.fetchedAt;
      if (oldestAge === null || age > oldestAge) {
        oldestAge = age;
      }
    }

    return {
      size: this.cache.size,
      oldestEntryAge: oldestAge,
    };
  }

  private async fetchTools(
    authToken: string
  ): Promise<DynamicStructuredTool[]> {
    const mcpConfig = toolsService.getIrminMCPConfig(authToken);
    const mcpClient = toolsService.createClient({
      ...mcpConfig,
    });
    return toolsService.getTools(mcpClient);
  }

  private hashToken(token: string): string {
    // Use first 16 chars of SHA-256 hash for efficiency
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();

    // Remove expired entries first
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.fetchedAt > this.CACHE_TTL * 2) {
        this.cache.delete(key);
      }
    }

    // If still over limit, evict oldest entries
    if (this.cache.size > this.MAX_ENTRIES) {
      const entries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].fetchedAt - b[1].fetchedAt
      );

      const toRemove = entries.slice(0, this.cache.size - this.MAX_ENTRIES);
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }
}

export const toolCacheService = new ToolCacheService();
