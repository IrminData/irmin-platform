import { aiModels, analytics, db, type NewAnalytics } from '@/database';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

interface AnalyticsEvent {
  eventType: string;
  conversationId?: string;
  aiModelId?: string;
  eventData?: Record<string, unknown>;
}

class AnalyticsService {
  async logEvent(event: AnalyticsEvent): Promise<void> {
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
        aiModelId: modelID,
        eventData: event.eventData,
        createdAt: new Date(),
      };

      await db.insert(analytics).values(analyticsEvent);
    } catch (error) {
      console.error('Failed to log custom analytics event:', error);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
