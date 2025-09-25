import { z } from 'zod';

import { env } from '@/config/env';

import { collectionService } from './vectorCollections';

// Collection validation schemas
const CollectionNameSchema = z
  .string()
  .min(1, 'Collection name is required')
  .max(100, 'Collection name too long')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Collection name can only contain letters, numbers, underscores, and hyphens'
  );

// Collection utilities
export class CollectionUtils {
  /**
   * Generate a unique collection name
   */
  static generateCollectionName(
    baseName: string,
    workspaceSlug: string
  ): string {
    const timestamp = Date.now();
    const sanitizedBase = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `${sanitizedBase}-${workspaceSlug}-${timestamp}`;
  }

  /**
   * Validate collection name format
   */
  static validateCollectionName(name: string): {
    isValid: boolean;
    error?: string;
  } {
    try {
      CollectionNameSchema.parse(name);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.issues[0]?.message };
      }
      return { isValid: false, error: 'Invalid collection name' };
    }
  }

  /**
   * Check if collection name is available
   */
  static async isCollectionNameAvailable(name: string): Promise<boolean> {
    try {
      const existing = await collectionService.getCollectionByName(name);
      return !existing;
    } catch (error) {
      console.error('Failed to check collection name availability:', error);
      return false;
    }
  }

  /**
   * Sanitize collection name for URL usage
   */
  static sanitizeCollectionName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate collection description from metadata
   */
  static generateDescription(metadata: {
    source?: string;
    type?: string;
    purpose?: string;
    tags?: string[];
  }): string {
    const parts: string[] = [];

    if (metadata.source) {
      parts.push(`Source: ${metadata.source}`);
    }

    if (metadata.type) {
      parts.push(`Type: ${metadata.type}`);
    }

    if (metadata.purpose) {
      parts.push(`Purpose: ${metadata.purpose}`);
    }

    if (metadata.tags && metadata.tags.length > 0) {
      parts.push(`Tags: ${metadata.tags.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Vector collection';
  }

  /**
   * Format collection statistics for display
   */
  static formatCollectionStats(stats: {
    documentCount: number;
    lastIndexedAt: Date | null;
    createdAt: Date;
  }): {
    documentCount: string;
    lastIndexed: string;
    age: string;
  } {
    const formatDocumentCount = (count: number): string => {
      if (count === 0) return 'No documents';
      if (count === 1) return '1 document';
      return `${count.toLocaleString()} documents`;
    };

    const formatLastIndexed = (date: Date | null): string => {
      if (!date) return 'Never indexed';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    };

    const formatAge = (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Created today';
      if (diffDays === 1) return 'Created yesterday';
      if (diffDays < 7) return `Created ${diffDays} days ago`;
      if (diffDays < 30) return `Created ${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365)
        return `Created ${Math.floor(diffDays / 30)} months ago`;
      return `Created ${Math.floor(diffDays / 365)} years ago`;
    };

    return {
      documentCount: formatDocumentCount(stats.documentCount),
      lastIndexed: formatLastIndexed(stats.lastIndexedAt),
      age: formatAge(stats.createdAt),
    };
  }

  /**
   * Validate collection access permissions
   */
  static async validateAccess(
    collectionId: string,
    userId: string,
    workspaceSlug: string
  ): Promise<{ hasAccess: boolean; error?: string }> {
    try {
      const hasAccess = await collectionService.hasAccessToCollection(
        collectionId,
        userId,
        workspaceSlug
      );

      if (!hasAccess) {
        return { hasAccess: false, error: 'Access denied to collection' };
      }

      return { hasAccess: true };
    } catch (error) {
      return {
        hasAccess: false,
        error:
          error instanceof Error ? error.message : 'Access validation failed',
      };
    }
  }

  /**
   * Get collection configuration for vector operations
   */
  static async getCollectionConfig(collectionId: string) {
    return await collectionService.getCollectionConfig(collectionId);
  }

  /**
   * Batch create collections with validation
   */
  static async batchCreateCollections(
    collections: Array<{
      name: string;
      workspaceSlug: string;
      userId: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<{
    successful: unknown[];
    failed: Array<{ collection: unknown; error: string }>;
  }> {
    const successful: unknown[] = [];
    const failed: Array<{ collection: unknown; error: string }> = [];

    for (const collection of collections) {
      try {
        // Validate collection name
        const nameValidation = this.validateCollectionName(collection.name);
        if (!nameValidation.isValid) {
          failed.push({ collection, error: nameValidation.error! });
          continue;
        }

        // Check if name is available
        const isAvailable = await this.isCollectionNameAvailable(
          collection.name
        );
        if (!isAvailable) {
          failed.push({ collection, error: 'Collection name already exists' });
          continue;
        }

        // Create collection
        const created = await collectionService.createCollection({
          name: collection.name,
          description: collection.description,
          vectorStoreUrl: env.QDRANT_URL,
          vectorStoreApiKey: env.QDRANT_API_KEY || '',
          embeddingModel: 'text-embedding-3-small',
          embeddingDimensions: 1536,
          workspaceSlug: collection.workspaceSlug,
          createdBy: collection.userId,
          isSystemCollection: false,
          metadata: collection.metadata,
        });

        successful.push(created);
      } catch (error) {
        failed.push({
          collection,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }
}
