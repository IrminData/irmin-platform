import { aiModels, analytics, db, type NewAnalytics } from '@/database';
import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';

type AnalyticsEventType =
  | 'conversation_created'
  | 'conversation_updated'
  | 'conversation_deleted'
  | 'message_sent'
  | 'agent_used'
  | 'model_used'
  | 'error_occurred'
  | 'vector_operation';

interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  conversationId?: string;
  messageId?: string;
  aiModelId?: string;
  tokenCount?: number;
  costUSD?: number;
  processingTimeMs?: number;
  eventData?: Record<string, unknown>;
}

class AnalyticsService {
  /**
   * Log a conversation event
   */
  async logConversationEvent(
    eventType:
      | 'conversation_created'
      | 'conversation_updated'
      | 'conversation_deleted',
    conversationId: string,
    eventData?: Record<string, unknown>
  ): Promise<void> {
    try {
      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType,
        conversationId,
        eventData,
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error(`Failed to log ${eventType} analytics:`, error);
    }
  }

  /**
   * Log a message sent event
   */
  async logMessageSent(
    conversationId: string,
    messageId: string
  ): Promise<void> {
    try {
      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType: 'message_sent',
        conversationId,
        messageId,
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error('Failed to log message sent analytics:', error);
    }
  }

  /**
   * Log an agent usage event
   */
  async logAgentUsed(
    conversationId: string,
    messageId: string,
    agentName?: string
  ): Promise<void> {
    try {
      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType: 'agent_used',
        conversationId,
        messageId,
        eventData: agentName ? { agentName } : undefined,
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error('Failed to log agent used analytics:', error);
    }
  }

  /**
   * Log AI model usage analytics
   */
  async logModelUsage(
    modelId: string,
    tokenCount: number,
    costUSD: number,
    processingTimeMs: number,
    conversationId?: string,
    messageId?: string,
    additionalEventData?: Record<string, unknown>
  ): Promise<void> {
    try {
      let modelID: number | undefined;

      // Look up the AI model by modelId to get the database ID
      const aiModel = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.modelId, modelId))
        .limit(1);

      if (aiModel.length > 0) {
        modelID = aiModel[0].id;
      }

      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType: 'model_used',
        aiModelId: modelID,
        tokenCount,
        costUSD,
        processingTimeMs,
        conversationId,
        messageId,
        eventData: {
          ...additionalEventData,
        },
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error('Failed to log model usage analytics:', error);
    }
  }

  /**
   * Log an error event
   */
  async logError(
    originalEventType: string,
    errorMessage: string,
    conversationId?: string,
    messageId?: string
  ): Promise<void> {
    try {
      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType: 'error_occurred',
        conversationId,
        messageId,
        eventData: {
          originalEventType,
          errorMessage,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error('Failed to log error analytics:', error);
    }
  }

  /**
   * Log a custom analytics event
   */
  async logCustomEvent(event: AnalyticsEvent): Promise<void> {
    try {
      let modelID: number | undefined;

      if (event.aiModelId) {
        const aiModel = await db
          .select()
          .from(aiModels)
          .where(eq(aiModels.modelId, event.aiModelId))
          .limit(1);

        if (aiModel.length > 0) {
          modelID = aiModel[0].id;
        }
      }

      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType: event.eventType,
        conversationId: event.conversationId,
        messageId: event.messageId,
        aiModelId: modelID,
        tokenCount: event.tokenCount,
        costUSD: event.costUSD,
        processingTimeMs: event.processingTimeMs,
        eventData: event.eventData,
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error('Failed to log custom analytics event:', error);
    }
  }

  /**
   * Get analytics for a specific conversation
   */
  async getConversationAnalytics(conversationId: string) {
    try {
      return await db
        .select()
        .from(analytics)
        .where(eq(analytics.conversationId, conversationId))
        .orderBy(desc(analytics.createdAt));
    } catch (error) {
      console.error('Failed to get conversation analytics:', error);
      return [];
    }
  }

  /**
   * Get analytics for a specific event type
   */
  async getEventTypeAnalytics(eventType: AnalyticsEventType) {
    try {
      return await db
        .select()
        .from(analytics)
        .where(eq(analytics.eventType, eventType))
        .orderBy(desc(analytics.createdAt));
    } catch (error) {
      console.error('Failed to get event type analytics:', error);
      return [];
    }
  }

  /**
   * Log vector indexing operations
   */
  async logVectorIndexing(
    operation:
      | 'vector_store_connected'
      | 'vector_store_created'
      | 'vector_store_updated'
      | 'vector_store_deleted'
      | 'documents_indexed'
      | 'embeddings_created'
      | 'embedding_created',
    eventData: {
      collectionName?: string;
      url?: string;
      documentCount?: number;
      textCount?: number;
      textLength?: number;
      embeddingDimensions?: number;
      isNewCollection?: boolean;
    }
  ): Promise<void> {
    try {
      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType: 'vector_operation',
        eventData: {
          operation,
          ...eventData,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error(
        `Failed to log vector indexing operation ${operation}:`,
        error
      );
    }
  }

  /**
   * Log vector retrieval operations
   */
  async logVectorRetrieval(
    operation:
      | 'similarity_search'
      | 'retrieval_with_analysis'
      | 'context_retrieved'
      | 'multi_query_retrieval'
      | 'compressed_retrieval',
    eventData: {
      query?: string;
      resultCount?: number;
      processingTimeMs?: number;
      collectionName?: string;
      k?: number;
      hasFilter?: boolean;
      hasFilters?: boolean;
      scoreThreshold?: number;
      contextWindow?: number;
      sourcesCount?: number;
      estimatedTokens?: number;
      queryCount?: number;
      totalResults?: number;
      originalCount?: number;
      compressedCount?: number;
      compressionThreshold?: number;
      maxChunkSize?: number;
    }
  ): Promise<void> {
    try {
      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType: 'vector_operation',
        eventData: {
          operation,
          ...eventData,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error(
        `Failed to log vector retrieval operation ${operation}:`,
        error
      );
    }
  }

  /**
   * Log vector errors
   */
  async logVectorError(
    operation: string,
    errorMessage: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    try {
      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType: 'error_occurred',
        eventData: {
          originalEventType: `vector_${operation}`,
          errorMessage,
          context,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error(`Failed to log vector error for ${operation}:`, error);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
