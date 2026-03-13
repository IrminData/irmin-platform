import { env } from '@/config/env';

/**
 * Reports AI request usage to the core API for billing tracking.
 * Fires and forgets — failures are warned but never block the caller.
 */
export async function reportAIUsage(
  workspaceId: string,
  quantity = 1
): Promise<void> {
  if (!env.IRMIN_SYSTEM_TOKEN) {
    return;
  }

  const endpoint = `${env.IRMIN_API_BASE_URL}/api/v1/system/usage/report`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.IRMIN_SYSTEM_TOKEN}`,
      },
      body: JSON.stringify({
        workspace_id: workspaceId,
        dimension: 'ai_requests',
        quantity,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(
        `Usage report failed: ${res.status} ${res.statusText}`,
        body
      );
    }
  } catch (error) {
    console.warn('Usage report error:', error);
  } finally {
    clearTimeout(timeout);
  }
}
