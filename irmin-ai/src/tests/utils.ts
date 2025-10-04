// Shared utilities for API tests
import { env } from '@/config/env';

import type { ConversationRequest, TestConfig, TestResult } from './types';

export const BASE_URL = env.URL;
export const WORKSPACE_SLUG =
  env.TEST_WORKSPACE_SLUG || 'no-workspace-provided';
export const TEST_AUTH_TOKEN = env.TEST_IRMIN_AUTH_TOKEN || 'no-token-provided';

// Test configuration
export const TEST_CONFIG: TestConfig = {
  timeout: 30000, // 30 seconds timeout for requests
  retries: 3,
  delay: 1000, // 1 second delay between tests
};

// Utility functions
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function logTest(
  testName: string,
  status: 'PASS' | 'FAIL' | 'RUNNING' | 'SKIP',
  details = ''
): void {
  const emoji =
    status === 'PASS'
      ? '✅'
      : status === 'FAIL'
        ? '❌'
        : status === 'SKIP'
          ? '⏭️'
          : '⏳';
  console.log(`${emoji} ${testName}${details ? ` - ${details}` : ''}`);
}

export function logSection(title: string): void {
  console.log(`\n🔍 ${title}`);
  console.log('='.repeat(50));
}

export async function makeRequest(
  url: string,
  options: RequestInit = {}
): Promise<TestResult> {
  const defaultHeaders: Record<string, string> = {
    Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
    'X-Workspace-Slug': WORKSPACE_SLUG,
  };

  // Only set Content-Type if there's a body to send
  if (options.body) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);
    const data = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      headers: {},
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function makeStreamingRequest(
  url: string,
  options: RequestInit = {}
): Promise<TestResult> {
  const defaultHeaders: Record<string, string> = {
    Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
    'X-Workspace-Slug': WORKSPACE_SLUG,
  };

  // Only set Content-Type if there's a body to send
  if (options.body) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        ok: false,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: errorData,
        error: `HTTP ${response.status}`,
        stream: null,
      };
    }

    return {
      ok: true,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: null,
      error: null,
      stream: response.body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      headers: {},
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      stream: null,
    };
  }
}

export async function processStream(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  return chunks.join('');
}

export function createAgentRequest(
  message: string,
  options: Partial<import('@/types/agents').AgentRequest> = {}
): import('@/types/agents').AgentRequest {
  return {
    message,
    toolSelection: {
      includeAll: true,
    },
    ...options,
  };
}

function createConversationRequest(
  options: Partial<ConversationRequest> = {}
): ConversationRequest {
  return {
    title: 'Test Conversation',
    ...options,
  };
}

// Create a new conversation and return its ID
export async function createTestConversation(
  title = 'Test Conversation'
): Promise<string | null> {
  try {
    const conversationRequest = createConversationRequest({ title });

    const result = await makeRequest(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      body: JSON.stringify(conversationRequest),
    });

    if (
      result.ok &&
      result.data &&
      typeof result.data === 'object' &&
      'id' in result.data
    ) {
      return result.data.id as string;
    } else {
      console.error('Failed to create conversation:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
}

// Delete a test conversation
export async function deleteTestConversation(
  conversationId: string
): Promise<boolean> {
  try {
    const result = await makeRequest(
      `${BASE_URL}/api/conversations/${conversationId}`,
      {
        method: 'DELETE',
      }
    );

    return result.ok;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }
}
