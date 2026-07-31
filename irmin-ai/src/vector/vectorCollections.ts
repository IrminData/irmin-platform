import {
  db,
  type NewVectorCollection,
  type VectorCollection,
  vectorCollections,
} from '@/database';
import { randomUUID } from 'crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// Collection validation schemas
const CollectionNameSchema = z
  .string()
  .min(1, 'Collection name is required')
  .max(100, 'Collection name too long')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Collection name can only contain letters, numbers, underscores, and hyphens'
  );

const CreateCollectionSchema = z.object({
  name: CollectionNameSchema,
  description: z.string().optional(),
  embeddingModel: z.string().default('text-embedding-3-small'),
  embeddingDimensions: z.number().int().min(1).default(1536),
  workspaceSlug: z.string().optional(), // Optional for system collections
  createdBy: z.string().optional(), // Optional for system collections
  isSystemCollection: z.boolean().optional().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const UpdateCollectionSchema = z.object({
  name: CollectionNameSchema.optional(),
  description: z.string().optional(),
  embeddingModel: z.string().optional(),
  embeddingDimensions: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type CreateCollectionData = z.infer<typeof CreateCollectionSchema>;
type UpdateCollectionData = z.infer<typeof UpdateCollectionSchema>;

interface CollectionStats {
  documentCount: number;
  lastIndexedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CollectionService handles CRUD operations for vector collections
 *
 * Provides methods to create, read, update, and delete vector collections
 * with proper validation and access control.
 */
class CollectionService {
  // --- Static Helper Methods ---

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

  // --- Instance Methods ---

  /**
   * Create a new vector collection
   */
  async createCollection(
    data: CreateCollectionData
  ): Promise<VectorCollection> {
    try {
      const validatedData = CreateCollectionSchema.parse(data);

      // Check if collection name already exists
      const existingCollection = await this.getCollectionByName(
        validatedData.name
      );
      if (existingCollection) {
        throw new Error(
          `Collection with name '${validatedData.name}' already exists`
        );
      }

      const newCollection: NewVectorCollection = {
        id: randomUUID(),
        name: validatedData.name,
        description: validatedData.description,
        embeddingModel: validatedData.embeddingModel,
        embeddingDimensions: validatedData.embeddingDimensions,
        workspaceSlug: validatedData.workspaceSlug || null,
        createdBy: validatedData.createdBy || null,
        isSystemCollection: validatedData.isSystemCollection,
        metadata: validatedData.metadata || {},
        isActive: true,
        documentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [createdCollection] = await db
        .insert(vectorCollections)
        .values(newCollection)
        .returning();

      return createdCollection;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Batch create collections with validation
   */
  async batchCreateCollections(
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
        const nameValidation = CollectionService.validateCollectionName(
          collection.name
        );
        if (!nameValidation.isValid) {
          failed.push({ collection, error: nameValidation.error! });
          continue;
        }

        // Check if name is available (using existing method)
        const existing = await this.getCollectionByName(collection.name);
        if (existing) {
          failed.push({ collection, error: 'Collection name already exists' });
          continue;
        }

        // Create collection
        const created = await this.createCollection({
          name: collection.name,
          description: collection.description,
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

  /**
   * Get a collection by ID
   */
  async getCollectionById(id: string): Promise<VectorCollection | null> {
    try {
      const [collection] = await db
        .select()
        .from(vectorCollections)
        .where(eq(vectorCollections.id, id))
        .limit(1);

      return collection || null;
    } catch (error) {
      console.error('Failed to get collection by ID:', error);
      return null;
    }
  }

  /**
   * Get a collection by name
   */
  async getCollectionByName(
    name: string,
    workspaceSlug?: string,
    userId?: string,
    isSystemCollection?: boolean,
    isActive?: boolean
  ): Promise<VectorCollection | null> {
    try {
      const [collection] = await db
        .select()
        .from(vectorCollections)
        .where(
          and(
            eq(vectorCollections.name, name),
            workspaceSlug
              ? eq(vectorCollections.workspaceSlug, workspaceSlug)
              : undefined,
            userId ? eq(vectorCollections.createdBy, userId) : undefined,
            isSystemCollection !== undefined
              ? eq(vectorCollections.isSystemCollection, isSystemCollection)
              : undefined,
            isActive !== undefined
              ? eq(vectorCollections.isActive, isActive)
              : undefined
          )
        )
        .limit(1);

      return collection || null;
    } catch (error) {
      console.error('Failed to get collection by name:', error);
      return null;
    }
  }

  /**
   * Get all collections (for system access)
   */
  async getAllCollections(): Promise<VectorCollection[]> {
    try {
      return await db
        .select()
        .from(vectorCollections)
        .orderBy(desc(vectorCollections.createdAt));
    } catch (error) {
      console.error('Failed to get all collections:', error);
      return [];
    }
  }

  /**
   * Get all collections for a workspace
   */
  async getCollectionsByWorkspace(
    workspaceSlug: string
  ): Promise<VectorCollection[]> {
    try {
      return await db
        .select()
        .from(vectorCollections)
        .where(eq(vectorCollections.workspaceSlug, workspaceSlug))
        .orderBy(desc(vectorCollections.createdAt));
    } catch (error) {
      console.error('Failed to get collections by workspace:', error);
      return [];
    }
  }

  /**
   * Get active collections for a workspace
   */
  async getActiveCollectionsByWorkspace(
    workspaceSlug: string
  ): Promise<VectorCollection[]> {
    try {
      return await db
        .select()
        .from(vectorCollections)
        .where(
          and(
            eq(vectorCollections.workspaceSlug, workspaceSlug),
            eq(vectorCollections.isActive, true)
          )
        )
        .orderBy(desc(vectorCollections.createdAt));
    } catch (error) {
      console.error('Failed to get active collections by workspace:', error);
      return [];
    }
  }

  /**
   * Update a collection
   */
  async updateCollection(
    id: string,
    data: UpdateCollectionData
  ): Promise<VectorCollection | null> {
    try {
      const validatedData = UpdateCollectionSchema.parse(data);

      // Check if collection exists
      const existingCollection = await this.getCollectionById(id);
      if (!existingCollection) {
        throw new Error(`Collection with ID '${id}' not found`);
      }

      // If updating name, check for conflicts
      if (
        validatedData.name &&
        validatedData.name !== existingCollection.name
      ) {
        const nameConflict = await this.getCollectionByName(validatedData.name);
        if (nameConflict) {
          throw new Error(
            `Collection with name '${validatedData.name}' already exists`
          );
        }
      }

      const [updatedCollection] = await db
        .update(vectorCollections)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(vectorCollections.id, id))
        .returning();

      return updatedCollection;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation error: ${error.issues.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Delete a collection (soft delete by setting isActive to false)
   */
  async deleteCollection(id: string): Promise<boolean> {
    try {
      const result = await db
        .update(vectorCollections)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(vectorCollections.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('Failed to delete collection:', error);
      return false;
    }
  }

  /**
   * Permanently delete a collection from the database
   */
  async permanentlyDeleteCollection(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(vectorCollections)
        .where(eq(vectorCollections.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('Failed to permanently delete collection:', error);
      return false;
    }
  }

  /**
   * Update collection statistics
   */
  async updateCollectionStats(
    id: string,
    stats: Partial<CollectionStats>
  ): Promise<VectorCollection | null> {
    try {
      const updateData: Partial<NewVectorCollection> = {
        updatedAt: new Date(),
      };

      if (stats.documentCount !== undefined) {
        updateData.documentCount = stats.documentCount;
      }
      if (stats.lastIndexedAt !== undefined) {
        updateData.lastIndexedAt = stats.lastIndexedAt;
      }

      const [updatedCollection] = await db
        .update(vectorCollections)
        .set(updateData)
        .where(eq(vectorCollections.id, id))
        .returning();

      return updatedCollection;
    } catch (error) {
      console.error('Failed to update collection stats:', error);
      return null;
    }
  }

  /**
   * Atomically increment document count for a collection using SQL arithmetic
   */
  async incrementDocumentCount(
    id: string,
    increment: number = 1
  ): Promise<boolean> {
    try {
      const result = await db
        .update(vectorCollections)
        .set({
          documentCount: sql`COALESCE(${vectorCollections.documentCount}, 0) + ${increment}`,
          lastIndexedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(vectorCollections.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('Failed to increment document count:', error);
      return false;
    }
  }

  /**
   * Atomically decrement document count for a collection using SQL arithmetic
   */
  async decrementDocumentCount(
    id: string,
    decrement: number = 1
  ): Promise<boolean> {
    try {
      const result = await db
        .update(vectorCollections)
        .set({
          documentCount: sql`GREATEST(0, COALESCE(${vectorCollections.documentCount}, 0) - ${decrement})`,
          lastIndexedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(vectorCollections.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('Failed to decrement document count:', error);
      return false;
    }
  }

  /**
   * Check if user has access to a collection
   *
   * Note: This method assumes workspace access has already been verified
   * by the workspace middleware. It only checks collection-level permissions.
   */
  async hasAccessToCollection(
    collectionId: string,
    userId: string,
    workspaceSlug: string
  ): Promise<boolean> {
    try {
      const collection = await this.getCollectionById(collectionId);
      if (!collection) {
        return false;
      }

      // Ensure collection is active
      if (!collection.isActive) {
        return false;
      }

      // System collections are not accessible through user routes
      if (collection.isSystemCollection) {
        return false;
      }

      // User must be in the same workspace as the collection
      // (Workspace access is already verified by middleware)
      if (collection.workspaceSlug !== workspaceSlug) {
        return false;
      }

      // Additional user-level access control:
      // - User can always access collections they created
      // - User can access collections in workspaces they belong to
      // (Workspace membership is verified by middleware)

      // If user created the collection, they have full access
      if (collection.createdBy === userId) {
        return true;
      }

      // If user has workspace access (verified by middleware), they can access collections
      // This allows workspace members to access each other's collections
      return true;
    } catch (error) {
      console.error('Failed to check collection access:', error);
      return false;
    }
  }

  /**
   * Get collection configuration for vector store operations
   */
  async getCollectionConfig(id: string) {
    try {
      const collection = await this.getCollectionById(id);
      if (!collection || !collection.isActive) {
        return null;
      }

      return {
        name: collection.name,
        embeddingModel: collection.embeddingModel,
        embeddingDimensions: collection.embeddingDimensions,
        workspaceSlug: collection.workspaceSlug,
        isSystemCollection: collection.isSystemCollection,
        createdBy: collection.createdBy,
      };
    } catch (error) {
      console.error('Failed to get collection config:', error);
      return null;
    }
  }
}

export const collectionService = new CollectionService();
