import type {
  AuthenticatedUser,
  SelectedWorkspace,
} from '@/types/request-context';

const CACHE_TTL = 30 * 1000; // 30 seconds in milliseconds
const CACHE_MAX_SIZE = 10000; // Maximum number of entries to prevent unbounded growth

// AuthCacheEntry represents a cached authentication result
interface AuthCacheEntry {
  user: AuthenticatedUser;
  expiresAt: number;
}

// WorkspaceCacheEntry represents a cached workspace result
interface WorkspaceCacheEntry {
  workspace: SelectedWorkspace;
  expiresAt: number;
}

// AuthCache provides thread-safe caching for authentication results
class AuthCache {
  private cache = new Map<string, AuthCacheEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Set up periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 10000); // Clean up every 10 seconds
  }

  // Get cached auth result
  get(token: string): AuthenticatedUser | null {
    const entry = this.cache.get(token);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(token);
      return null;
    }

    return entry.user;
  }

  // Set cached auth result, enforcing max size
  set(token: string, user: AuthenticatedUser): void {
    // Evict expired entries if at capacity
    if (this.cache.size >= CACHE_MAX_SIZE) {
      this.cleanupExpiredEntries();
    }
    // If still at capacity, remove oldest entry
    if (this.cache.size >= CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(token, {
      user,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }

  // Invalidate cached auth result
  invalidate(token: string): void {
    this.cache.delete(token);
  }

  // Clean up expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, token) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(token);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  // Destroy the cache and cleanup interval
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// WorkspaceCache provides caching for workspace results
class WorkspaceCache {
  private cache = new Map<string, WorkspaceCacheEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Set up periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 10000); // Clean up every 10 seconds
  }

  // Generate cache key from workspace slug and user ID
  private getCacheKey(workspaceSlug: string, userId: string): string {
    return `${workspaceSlug}:${userId}`;
  }

  // Get cached workspace result
  get(workspaceSlug: string, userId: string): SelectedWorkspace | null {
    const key = this.getCacheKey(workspaceSlug, userId);
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.workspace;
  }

  // Set cached workspace result, enforcing max size
  set(
    workspaceSlug: string,
    userId: string,
    workspace: SelectedWorkspace
  ): void {
    // Evict expired entries if at capacity
    if (this.cache.size >= CACHE_MAX_SIZE) {
      this.cleanupExpiredEntries();
    }
    // If still at capacity, remove oldest entry
    if (this.cache.size >= CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    const key = this.getCacheKey(workspaceSlug, userId);
    this.cache.set(key, {
      workspace,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }

  // Invalidate cached workspace result
  invalidate(workspaceSlug: string, userId: string): void {
    const key = this.getCacheKey(workspaceSlug, userId);
    this.cache.delete(key);
  }

  // Invalidate all workspace cache entries for a specific user
  invalidateUser(userId: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (key.endsWith(`:${userId}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  // Clean up expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  // Destroy the cache and cleanup interval
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Global cache instances
export const authCache = new AuthCache();
export const workspaceCache = new WorkspaceCache();

// Graceful shutdown cleanup
process.on('SIGINT', () => {
  authCache.destroy();
  workspaceCache.destroy();
});

process.on('SIGTERM', () => {
  authCache.destroy();
  workspaceCache.destroy();
});
