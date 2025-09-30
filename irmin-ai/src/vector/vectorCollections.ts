import {
  db,
  type NewVectorCollection,
  type VectorCollection,
  vectorCollections,
} from '@/database';
import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

// Zod schemas for validation
const CreateCollectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Collection name is required')
    .max(100, 'Collection name too long'),
  description: z.string().optional(),
  embeddingModel: z.string().default('text-embedding-3-small'),
  embeddingDimensions: z.number().int().min(1).default(1536),
  workspaceSlug: z.string().optional(), // Optional for system collections
  createdBy: z.string().optional(), // Optional for system collections
  isSystemCollection: z.boolean().optional().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const UpdateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
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
  async getCollectionByName(name: string): Promise<VectorCollection | null> {
    try {
      const [collection] = await db
        .select()
        .from(vectorCollections)
        .where(eq(vectorCollections.name, name))
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
   * Increment document count for a collection
   */
  async incrementDocumentCount(
    id: string,
    increment: number = 1
  ): Promise<boolean> {
    try {
      const collection = await this.getCollectionById(id);
      if (!collection) {
        return false;
      }

      await this.updateCollectionStats(id, {
        documentCount: (collection.documentCount || 0) + increment,
        lastIndexedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Failed to increment document count:', error);
      return false;
    }
  }

  /**
   * Decrement document count for a collection
   */
  async decrementDocumentCount(
    id: string,
    decrement: number = 1
  ): Promise<boolean> {
    try {
      const collection = await this.getCollectionById(id);
      if (!collection) {
        return false;
      }

      const newCount = Math.max(0, (collection.documentCount || 0) - decrement);
      await this.updateCollectionStats(id, {
        documentCount: newCount,
        lastIndexedAt: new Date(),
      });

      return true;
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
