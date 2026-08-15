import { analytics, db, type NewAnalytics } from '@/database';
import { randomUUID } from 'crypto';

interface AnalyticsEvent {
  eventType: string;
  conversationId?: string;
  eventData?: Record<string, unknown>;
}

class AnalyticsService {
  async logEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const analyticsEvent: NewAnalytics = {
        id: randomUUID(),
        eventType: event.eventType,
        conversationId: event.conversationId,
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
